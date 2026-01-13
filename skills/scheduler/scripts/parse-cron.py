#!/usr/bin/env python3
"""
Cron expression parser and validator.

Usage:
    python parse-cron.py "0 9 * * 1-5"
    python parse-cron.py --next 5 "0 9 * * 1-5"
    python parse-cron.py --human "0 9 * * 1-5"
"""

import sys
import re
from datetime import datetime, timedelta
from typing import List, Optional, Tuple

DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December']


def parse_field(field: str, min_val: int, max_val: int) -> List[int]:
    """Parse a cron field into a list of valid values."""
    values = set()

    for part in field.split(','):
        if part == '*':
            values.update(range(min_val, max_val + 1))
        elif '/' in part:
            base, step = part.split('/')
            step = int(step)
            if base == '*':
                start = min_val
            else:
                start = int(base.split('-')[0])
            values.update(range(start, max_val + 1, step))
        elif '-' in part:
            start, end = map(int, part.split('-'))
            values.update(range(start, end + 1))
        else:
            values.add(int(part))

    return sorted(v for v in values if min_val <= v <= max_val)


def validate_cron(expression: str) -> Tuple[bool, Optional[str]]:
    """Validate a cron expression."""
    parts = expression.strip().split()

    if len(parts) != 5:
        return False, f"Expected 5 fields, got {len(parts)}"

    field_specs = [
        ('minute', 0, 59),
        ('hour', 0, 23),
        ('day of month', 1, 31),
        ('month', 1, 12),
        ('day of week', 0, 7),  # 7 is also Sunday
    ]

    for i, (name, min_val, max_val) in enumerate(field_specs):
        try:
            values = parse_field(parts[i], min_val, max_val)
            if not values:
                return False, f"Invalid {name}: {parts[i]}"
        except Exception as e:
            return False, f"Invalid {name}: {parts[i]} ({e})"

    return True, None


def humanize_cron(expression: str) -> str:
    """Convert cron expression to human-readable string."""
    parts = expression.strip().split()
    if len(parts) != 5:
        return expression

    minute, hour, dom, month, dow = parts

    # Build description
    desc_parts = []

    # Time
    if minute == '*' and hour == '*':
        desc_parts.append("Every minute")
    elif minute.startswith('*/'):
        desc_parts.append(f"Every {minute[2:]} minutes")
    elif hour == '*':
        desc_parts.append(f"At minute {minute} of every hour")
    elif minute == '0':
        if hour.startswith('*/'):
            desc_parts.append(f"Every {hour[2:]} hours")
        else:
            hours = parse_field(hour, 0, 23)
            times = [f"{h}:00" for h in hours]
            desc_parts.append(f"At {', '.join(times)}")
    else:
        hours = parse_field(hour, 0, 23)
        mins = parse_field(minute, 0, 59)
        times = [f"{h}:{m:02d}" for h in hours for m in mins]
        desc_parts.append(f"At {', '.join(times[:3])}" + ("..." if len(times) > 3 else ""))

    # Day of week
    if dow != '*':
        days = parse_field(dow, 0, 7)
        # Normalize Sunday (7 -> 0)
        days = [d % 7 for d in days]
        days = sorted(set(days))

        if days == [1, 2, 3, 4, 5]:
            desc_parts.append("on weekdays")
        elif days == [0, 6]:
            desc_parts.append("on weekends")
        elif len(days) == 1:
            desc_parts.append(f"on {DAYS_OF_WEEK[days[0]]}")
        else:
            day_names = [DAYS_OF_WEEK[d] for d in days]
            desc_parts.append(f"on {', '.join(day_names)}")

    # Day of month
    elif dom != '*':
        days = parse_field(dom, 1, 31)
        if len(days) == 1:
            desc_parts.append(f"on day {days[0]} of the month")
        else:
            desc_parts.append(f"on days {', '.join(map(str, days[:3]))}" + ("..." if len(days) > 3 else ""))

    # Month
    if month != '*':
        months = parse_field(month, 1, 12)
        month_names = [MONTHS[m] for m in months]
        desc_parts.append(f"in {', '.join(month_names)}")

    return " ".join(desc_parts)


def get_next_runs(expression: str, count: int = 5) -> List[datetime]:
    """Calculate the next N run times for a cron expression."""
    parts = expression.strip().split()
    if len(parts) != 5:
        return []

    minutes = parse_field(parts[0], 0, 59)
    hours = parse_field(parts[1], 0, 23)
    doms = parse_field(parts[2], 1, 31)
    months = parse_field(parts[3], 1, 12)
    dows = parse_field(parts[4], 0, 7)
    dows = [d % 7 for d in dows]  # Normalize Sunday

    runs = []
    current = datetime.now().replace(second=0, microsecond=0)

    # Look ahead up to 2 years
    end_date = current + timedelta(days=730)

    while len(runs) < count and current < end_date:
        current += timedelta(minutes=1)

        if current.minute not in minutes:
            continue
        if current.hour not in hours:
            continue
        if current.month not in months:
            continue

        # Check day (dom OR dow)
        dom_match = parts[2] == '*' or current.day in doms
        dow_match = parts[4] == '*' or current.weekday() in [(d - 1) % 7 for d in dows] or current.weekday() == 6 and 0 in dows

        if dom_match or dow_match:
            runs.append(current)

    return runs


def main():
    if len(sys.argv) < 2:
        print("Usage: python parse-cron.py [--next N] [--human] <cron-expression>")
        print()
        print("Examples:")
        print("  python parse-cron.py '0 9 * * 1-5'")
        print("  python parse-cron.py --next 5 '0 9 * * *'")
        print("  python parse-cron.py --human '*/15 * * * *'")
        sys.exit(1)

    args = sys.argv[1:]
    show_next = 0
    show_human = False
    expression = None

    i = 0
    while i < len(args):
        if args[i] == '--next':
            show_next = int(args[i + 1])
            i += 2
        elif args[i] == '--human':
            show_human = True
            i += 1
        else:
            expression = args[i]
            i += 1

    if not expression:
        print("Error: No cron expression provided")
        sys.exit(1)

    # Validate
    valid, error = validate_cron(expression)
    if not valid:
        print(f"Invalid cron expression: {error}")
        sys.exit(1)

    print(f"Expression: {expression}")
    print(f"Valid: Yes")

    # Human readable
    human = humanize_cron(expression)
    print(f"Description: {human}")

    # Next runs
    if show_next > 0 or not show_human:
        runs = get_next_runs(expression, show_next or 5)
        print(f"\nNext {len(runs)} runs:")
        for run in runs:
            print(f"  {run.strftime('%a %b %d %Y %H:%M')}")


if __name__ == '__main__':
    main()
