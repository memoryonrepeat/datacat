### Overview

- This simple console program monitors the incoming HTTP traffic via CLF log file (default to /tmp/access.log, overridable).
- Every 10 seconds, the section with most hit will be announced.
- If the average hits per second for the last 2 minutes exceeds the threshold (10 by default), an alert will be triggered. When traffic returns to normal, the alert will go off.

### Design
- The core idea is to keep track of traffic information via a circular buffer. Each slot in the buffer corresponds to
the module of the log timestamp to the window length. By doing so we can save space by storing counts of the same modulo together. Those that are outdated will be overridden as the window moves, since we are only concerned about the traffic within that window.
- There is a a flag to keep track of alerting status. On each incoming log, we revisit the average count and turn on the alert if needed. Once alert is turned on, we run a cron job to revisit the count every second to see if traffic is going back to normal.

### Testing
- Install dependencies: `npm install`
- Start the program: `npm start`. This will default to read /tmp/access.log, but a sample log file is also provided at sample.log for easier testing (more details in source file). Note that the last line should be follow by a new line character so that the change is acknowledged.
- Run unit test: `npm test`

### Potential improvements
- Use Redis hash with expire option to store the counter. Old keys will automatically expire over time, which makes the logic simpler.
- Use probabilistic data structure such as HyperLogLog / Count–min sketch to approximate the stats. This might be useful for very large traffic.
- Estimate cooldown time to wait until traffic becomes normal (the most optimistic case where there is no traffic during cooldown time), then only check after that time instead of checking every second. This helps reducing the rate of checks, but might complicate the logic so I went with the simpler way for better readability.
- In distributed environment, there might be race condition when multiple nodes are writing to the same counter. If that happens, some locking mechanism should be introduced to avoid the race condition.
