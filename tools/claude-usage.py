#!/usr/bin/env python3
"""Read Claude's native plan meters and guard the assigned wkolon worker."""
import argparse
from datetime import datetime, timezone
import fcntl
import json
from pathlib import Path
import re
import subprocess
import sys
import time

CAP = 75


def parse_usage(text):
    text = re.sub(r'\x1b\[[0-?]*[ -/]*[@-~]', '', text)
    if re.search(r'last.known|rate.limit|could not|failed to|unable to', text, re.I):
        raise ValueError('Fresh Claude usage is unavailable')
    if 'subscription' not in text.lower():
        raise ValueError('Claude subscription meters unavailable')
    patterns = {'five_hour': r'Current session:\s*(\d+(?:\.\d+)?)% used',
                'weekly': r'Current week \(all models\):\s*(\d+(?:\.\d+)?)% used'}
    values = {}
    for name, pattern in patterns.items():
        match = re.search(pattern, text)
        if not match or not 0 <= float(match[1]) <= 100:
            raise ValueError('Missing or invalid Claude ' + name + ' meter')
        values[name] = float(match[1])
    return values


def directory():
    common = subprocess.check_output(['git', 'rev-parse', '--path-format=absolute', '--git-common-dir'], text=True)
    folder = Path(common.strip()) / 'wkolon-team'
    folder.mkdir(exist_ok=True)
    return folder


def usage(fresh=False):
    folder = directory()
    with (folder / 'claude-usage.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        file = folder / 'claude-usage.json'
        if file.exists() and not fresh:
            cached = json.loads(file.read_text())
            if 0 <= time.time() - cached.get('queriedAtEpoch', 0) < 60 and cached.get('stop_used_percent') == CAP:
                return cached
        result = subprocess.run(['claude', '-p', '/usage'], capture_output=True, text=True, timeout=35)
        if result.returncode:
            raise ValueError('Claude usage command failed')
        values = parse_usage(result.stdout)
        data = dict(used_percent=values, stop_used_percent=CAP,
                    stop=any(value >= CAP for value in values.values()),
                    queriedAt=datetime.now(timezone.utc).isoformat(), queriedAtEpoch=time.time())
        temporary = file.with_suffix('.tmp')
        temporary.write_text(json.dumps(data, indent=2) + '\n')
        temporary.replace(file)
        return data


def stop_worker(session, task_id, reason):
    folder = directory()
    with (folder / 'lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        file = folder / 'tasks.json'
        tasks = json.loads(file.read_text())
        task = tasks[task_id]
        if task.get('claudeSessionShortId') != session:
            raise ValueError('Quota watcher does not own this session')
        task.update(status='paused', pauseReason=reason, updated=datetime.now(timezone.utc).isoformat())
        temporary = file.with_suffix('.tmp')
        temporary.write_text(json.dumps(tasks, indent=2) + '\n')
        temporary.replace(file)
    result = subprocess.run(['claude', 'stop', session], capture_output=True, text=True, timeout=20)
    if result.returncode:
        raise ValueError('Claude stop failed; inspect native session state')
    print(json.dumps({'session': session, 'stopped': True, 'reason': reason}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--fresh', action='store_true')
    parser.add_argument('--hook', action='store_true')
    parser.add_argument('--watch-session')
    parser.add_argument('--task', default='CLAUDE-AUTOMATION')
    args = parser.parse_args()
    if args.hook:
        sys.stdin.read()  # Consume the native hook payload without logging it.
    try:
        if args.watch_session:
            result = subprocess.run(['claude', 'agents', '--json', '--all'], capture_output=True, text=True, timeout=20)
            if result.returncode:
                raise ValueError('Cannot verify Claude worker state')
            rows = json.loads(result.stdout)
            row = next((row for row in rows if row.get('id') == args.watch_session), None)
            if row is None or row.get('state') in ['stopped', 'completed', 'failed']:
                return 0
        data = usage(args.fresh)
        if data['stop']:
            reason = 'Claude plan usage reached 75% used (25% remaining) in a five-hour or weekly window'
            if args.watch_session:
                stop_worker(args.watch_session, args.task, reason)
            elif args.hook:
                print(reason + '. Checkpoint and stop this goal; do not resume after reset.', file=sys.stderr)
                return 2
            print(json.dumps(data))
            return 75
        if not args.hook:
            print(json.dumps(data))
        return 0
    except (ValueError, KeyError, OSError, subprocess.SubprocessError) as error:
        if args.watch_session:
            stop_worker(args.watch_session, args.task, 'Usage cannot be verified: ' + str(error))
        print(str(error), file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
