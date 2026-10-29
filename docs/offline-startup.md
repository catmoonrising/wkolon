# Offline startup

The initial application loads its required rules before rendering. Automatic
service-worker registration currently begins at DOMContentLoaded, so its full
offline precache can download rules and other large files concurrently with
that first load. Schedule optional precaching after the boot attempt settles.
This is a request-order guarantee, not a promised network speedup.

The application signals boot settlement after either successful initialization
or its existing failure display. Failure must still allow worker registration
and future updates. Use a document state marker plus a one-shot event so either
script order works. Offline registration must run at most once even if signals
repeat. A cached, already-controlled application retains its cache and update
behavior; this only schedules automatic registration/update discovery.

Keep HTTPS/localhost exclusions, first-install no-reload behavior, update
notices and explicit Reload activation unchanged. Do not register on local
development hosts, clear a cache, replace a roster, reload on first install or
silently activate an update. Do not add a loading overlay or new user labels.
No rules/character/resource semantics change.

Verify registration is absent while the required rules response is pending,
begins after visible success or visible boot failure, works when the offline
script is late, and remains once-only under repeated signals. Verify locality
and unsupported-browser exclusions. Exercise the actual application boot and
offline script, not a duplicate boot implementation. Preserve actual hosted
worker readiness, reload and genuinely refused network checks. Independent
review and the combined suite precede publication.
