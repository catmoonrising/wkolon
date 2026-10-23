#!/usr/bin/env python3
"""Local task ownership and a bounded Claude review, shared by Git worktrees."""
import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import fcntl
import hashlib
import json
import os
import re
from pathlib import Path
import shutil
import subprocess
import sys


def git(*args, cwd=None):
    return subprocess.check_output(['git', *args], cwd=cwd, text=True).strip()


ROOT = Path(git('rev-parse', '--show-toplevel'))
COMMON = Path(git('rev-parse', '--path-format=absolute', '--git-common-dir'))
STATE = COMMON / 'wkolon-team'


def now():
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def board():
    STATE.mkdir(exist_ok=True)
    with (STATE / 'lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        file = STATE / 'tasks.json'
        tasks = json.loads(file.read_text()) if file.exists() else {}
        yield tasks
        temporary = STATE / 'tasks.tmp'
        temporary.write_text(json.dumps(tasks, indent=2) + '\n')
        temporary.replace(file)


def require(condition, message):
    if not condition:
        raise ValueError(message)


def claim(tasks, task_id, owner):
    task = tasks[task_id]
    require(task['owner'] == owner, 'Task belongs to another owner')
    require(task['branch'] == git('branch', '--show-current'), 'Use the assigned branch and worktree')
    require(task['status'] == 'ready', 'Task is already claimed or handed off')
    task.update(status='claimed', worktree=str(ROOT), updated=now())
    return task.copy()


def review():
    task_id = 'REROLL-REVIEW'
    with board() as tasks:
        task = claim(tasks, task_id, 'claude')
    try:
        target = Path(task['target'])
        require(git('branch', '--show-current', cwd=target) == 'substitution-rerolls', 'Review target branch changed')
        base = git('rev-parse', 'HEAD', cwd=target)
        diff = subprocess.check_output(['git', 'diff', 'HEAD', '--binary'], cwd=target)
        require(bool(diff), 'No saved correction to review')
        fingerprint = hashlib.sha256(base.encode() + diff).hexdigest()
        folder = STATE / 'reports' / (task_id + '-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
        folder.mkdir(parents=True)
        patch = folder / 'input.patch'
        patch.write_bytes(diff)
        schema = {'type': 'object', 'additionalProperties': False,
                  'required': ['verdict', 'summary', 'findings', 'inspectedFiles', 'verificationLimits'],
                  'properties': {'verdict': {'enum': ['approved', 'changes-requested', 'blocked']},
                                 'summary': {'type': 'string'},
                                 'findings': {'type': 'array', 'items': {'type': 'string'}},
                                 'inspectedFiles': {'type': 'array', 'items': {'type': 'string'}},
                                 'verificationLimits': {'type': 'array', 'items': {'type': 'string'}}}}
        prompt = (f'Read AGENTS.md, CLAUDE.md and docs/team.md in this checkout. Your only task is '
                  f'REROLL-REVIEW. Independently review the saved correction at {target}; '
                  f'the exact input patch is {patch}, base commit {base}. Read the changed source, '
                  'tests and pinned article text in data/core.json there. Verify the printed '
                  'carryover permissions and narrow applications, source identity/use limits, '
                  'source loss and validation. Inspect the tests critically. Report concrete bugs '
                  'with relative file paths and lines, severity and reproductions, or state no '
                  'findings. Return the requested JSON schema. List inspected files and validation '
                  'limits. You have read-only tools: do not edit, run commands, delegate, publish, '
                  'change task state or resume automation. Do not claim tests were executed by you. '
                  'The launcher records your output and hands it back to Codex. Stop after this review.')
        env = os.environ.copy()
        if not shutil.which('node'):
            candidates = sorted((Path.home() / '.cache/wkolon-tools').glob('node-v*/bin'))
            require(bool(candidates), 'Install Node 22+ or add it to PATH')
            env['PATH'] = str(candidates[-1]) + os.pathsep + env.get('PATH', '')
        command = ['claude', '-p', '--output-format', 'json', '--json-schema', json.dumps(schema),
                   '--permission-mode', 'dontAsk', '--tools', 'Read,Glob,Grep',
                   '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}',
                   '--add-dir', str(target), str(folder), '--', prompt]
        print('Claude is reviewing. Report directory:', folder, flush=True)
        result = subprocess.run(command, cwd=ROOT, env=env, capture_output=True, text=True)
        require(result.returncode == 0, f'Claude exited {result.returncode}; check Claude authentication and availability')
        output = json.loads(result.stdout)
        require(not output.get('is_error'), 'Claude reported an error')
        report = output.get('structured_output')
        require(isinstance(report, dict) and report.get('verdict') in schema['properties']['verdict']['enum'], 'Claude did not return the review schema')
        require(bool(report.get('inspectedFiles')), 'Review did not identify inspected files')
        after = subprocess.check_output(['git', 'diff', 'HEAD', '--binary'], cwd=target)
        require(hashlib.sha256(git('rev-parse', 'HEAD', cwd=target).encode() + after).hexdigest() == fingerprint,
                'Review target changed; rerun against the new diff')
        report.update(base=base, diffSha256=fingerprint)
        report_file = folder / 'review.json'
        report_file.write_text(json.dumps(report, indent=2) + '\n')
        with board() as tasks:
            tasks[task_id].update(status='handoff', result=report['verdict'], report=str(report_file), updated=now())
        print('Review handed off:', report['verdict'])
        print('Report:', report_file)
    except BaseException as error:
        with board() as tasks:
            tasks[task_id].update(status='blocked', error=str(error), updated=now())
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser('status')
    commands.add_parser('review')
    add = commands.add_parser('add')
    add.add_argument('id')
    add.add_argument('--owner', required=True, choices=['codex', 'claude'])
    add.add_argument('--branch', required=True)
    add.add_argument('--description', required=True)
    for name in ['claim', 'handoff', 'release', 'finish']:
        item = commands.add_parser(name)
        item.add_argument('id')
        item.add_argument('--owner', required=True, choices=['codex', 'claude'])
        if name == 'handoff':
            item.add_argument('report', type=Path)
    args = parser.parse_args()
    if args.command == 'review':
        return review()
    if hasattr(args, 'id'):
        require(bool(re.fullmatch(r'[A-Z][A-Z0-9-]{0,79}', args.id)), 'Use an uppercase task ID with letters, digits and hyphens')
    if args.command == 'add':
        subprocess.run(['git', 'check-ref-format', '--branch', args.branch], check=True, stdout=subprocess.DEVNULL)
    with board() as tasks:
        if args.command == 'status':
            print(json.dumps(tasks, indent=2))
        elif args.command == 'add':
            require(args.id not in tasks, 'Task already exists')
            tasks[args.id] = dict(owner=args.owner, branch=args.branch, description=args.description, status='ready', updated=now())
        else:
            require(args.id in tasks, 'Unknown task')
            task = tasks[args.id]
            if args.command == 'claim':
                claim(tasks, args.id, args.owner)
            elif args.command == 'handoff':
                require(task['owner'] == args.owner and task['status'] == 'claimed', 'Not your claimed task')
                require(task.get('worktree') == str(ROOT), 'Use the claimed worktree')
                require(args.report.is_file(), 'Report does not exist')
                destination = STATE / 'reports' / (args.id + '-handoff.md')
                destination.parent.mkdir(exist_ok=True)
                shutil.copyfile(args.report, destination)
                task.update(status='handoff', report=str(destination), head=git('rev-parse', 'HEAD'), updated=now())
            else:
                require(args.owner == 'codex', 'Only the integrator can release or finish tasks')
                require(task['status'] != 'integrated', 'Task already integrated')
                if args.command == 'finish':
                    require(task['status'] == 'handoff', 'No handoff to integrate')
                task.update(status='ready' if args.command == 'release' else 'integrated', updated=now())


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, subprocess.CalledProcessError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
