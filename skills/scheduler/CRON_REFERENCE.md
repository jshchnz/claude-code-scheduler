# Cron Expression Reference

Complete guide to cron expression syntax.

## Basic Format

```
┌───────────── minute (0-59)
│ ┌───────────── hour (0-23)
│ │ ┌───────────── day of month (1-31)
│ │ │ ┌───────────── month (1-12)
│ │ │ │ ┌───────────── day of week (0-6, Sunday=0)
│ │ │ │ │
* * * * *
```

## Field Values

| Field | Range | Special Characters |
|-------|-------|-------------------|
| Minute | 0-59 | * , - / |
| Hour | 0-23 | * , - / |
| Day of Month | 1-31 | * , - / |
| Month | 1-12 | * , - / |
| Day of Week | 0-6 (Sun=0) | * , - / |

## Special Characters

### Asterisk (*)
Matches all values.
- `* * * * *` = Every minute

### Comma (,)
List of values.
- `0 9,17 * * *` = At 9:00 AM and 5:00 PM

### Hyphen (-)
Range of values.
- `0 9-17 * * *` = Every hour from 9 AM to 5 PM
- `0 9 * * 1-5` = Weekdays at 9:00 AM

### Slash (/)
Step values.
- `*/15 * * * *` = Every 15 minutes
- `0 */2 * * *` = Every 2 hours
- `0 9-17/2 * * *` = Every 2 hours from 9 AM to 5 PM

## Common Patterns

### Time-based

| Pattern | Description |
|---------|-------------|
| `* * * * *` | Every minute |
| `*/5 * * * *` | Every 5 minutes |
| `*/15 * * * *` | Every 15 minutes |
| `*/30 * * * *` | Every 30 minutes |
| `0 * * * *` | Every hour (at minute 0) |
| `0 */2 * * *` | Every 2 hours |
| `0 */4 * * *` | Every 4 hours |
| `0 */6 * * *` | Every 6 hours |
| `0 */12 * * *` | Every 12 hours |

### Daily

| Pattern | Description |
|---------|-------------|
| `0 0 * * *` | Daily at midnight |
| `0 6 * * *` | Daily at 6:00 AM |
| `0 9 * * *` | Daily at 9:00 AM |
| `0 12 * * *` | Daily at noon |
| `0 18 * * *` | Daily at 6:00 PM |
| `0 23 * * *` | Daily at 11:00 PM |
| `30 9 * * *` | Daily at 9:30 AM |

### Weekdays/Weekends

| Pattern | Description |
|---------|-------------|
| `0 9 * * 1-5` | Weekdays at 9:00 AM |
| `0 9 * * 0,6` | Weekends at 9:00 AM |
| `0 9 * * 1` | Every Monday at 9:00 AM |
| `0 9 * * 5` | Every Friday at 9:00 AM |
| `0 17 * * 5` | Every Friday at 5:00 PM |

### Monthly

| Pattern | Description |
|---------|-------------|
| `0 9 1 * *` | First day of month at 9:00 AM |
| `0 9 15 * *` | 15th of month at 9:00 AM |
| `0 9 1,15 * *` | 1st and 15th at 9:00 AM |
| `0 0 1 * *` | First day of month at midnight |

### Yearly

| Pattern | Description |
|---------|-------------|
| `0 0 1 1 *` | January 1st at midnight |
| `0 9 1 1 *` | January 1st at 9:00 AM |
| `0 9 1 */3 *` | First day of quarter at 9:00 AM |

## Day of Week Values

| Value | Day |
|-------|-----|
| 0 | Sunday |
| 1 | Monday |
| 2 | Tuesday |
| 3 | Wednesday |
| 4 | Thursday |
| 5 | Friday |
| 6 | Saturday |
| 7 | Sunday (alternative) |

## Month Values

| Value | Month |
|-------|-------|
| 1 | January |
| 2 | February |
| 3 | March |
| 4 | April |
| 5 | May |
| 6 | June |
| 7 | July |
| 8 | August |
| 9 | September |
| 10 | October |
| 11 | November |
| 12 | December |

## Complex Examples

### Business hours
```
0 9-17 * * 1-5
```
Every hour from 9 AM to 5 PM on weekdays.

### Twice daily on weekdays
```
0 9,17 * * 1-5
```
At 9:00 AM and 5:00 PM, Monday through Friday.

### Every 30 minutes during business hours
```
*/30 9-17 * * 1-5
```

### First Monday of each month
```
0 9 1-7 * 1
```
At 9:00 AM on the first Monday (day 1-7 AND Monday).

### Last day of month (approximate)
```
0 9 28-31 * *
```
At 9:00 AM on days 28-31 (runs multiple times in long months).

## Natural Language Conversion

| Natural Language | Cron Expression |
|-----------------|-----------------|
| "every minute" | `* * * * *` |
| "every hour" | `0 * * * *` |
| "every day at 9am" | `0 9 * * *` |
| "every weekday at 9am" | `0 9 * * 1-5` |
| "every Monday at 10am" | `0 10 * * 1` |
| "every 15 minutes" | `*/15 * * * *` |
| "twice daily" | `0 9,17 * * *` |
| "weekly" | `0 9 * * 1` |
| "monthly" | `0 9 1 * *` |

## Validation

Use the helper script to validate expressions:
```bash
python scripts/parse-cron.py "0 9 * * 1-5"
```

Or use online tools:
- [crontab.guru](https://crontab.guru/)
- [cronitor.io/cron-reference](https://cronitor.io/guides/cron-jobs)

## Platform Notes

### macOS (launchd)
- Uses `StartCalendarInterval` in plist
- Some complex expressions may be simplified
- Step values have limited support

### Linux (crontab)
- Full cron syntax support
- Entries added to user's crontab

### Windows (Task Scheduler)
- Maps to schedule types (DAILY, WEEKLY, MONTHLY)
- Some cron features may not translate exactly
