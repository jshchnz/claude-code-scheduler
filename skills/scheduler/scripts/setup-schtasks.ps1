# Windows Task Scheduler setup helper
# Usage: .\setup-schtasks.ps1 -TaskId "task-id" -CronExpr "0 9 * * 1-5" -Command "claude -p /review" [-WorkDir "C:\path"]

param(
    [Parameter(Mandatory=$true)]
    [string]$TaskId,

    [Parameter(Mandatory=$true)]
    [string]$CronExpr,

    [Parameter(Mandatory=$true)]
    [string]$Command,

    [string]$WorkDir = (Get-Location).Path
)

$TaskFolder = "\ClaudeScheduler"
$TaskName = "$TaskFolder\$TaskId"
$LogDir = "$env:USERPROFILE\.claude\logs"

# Ensure log directory exists
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

# Parse cron expression
$parts = $CronExpr -split '\s+'
if ($parts.Count -ne 5) {
    Write-Error "Invalid cron expression. Expected 5 fields."
    exit 1
}

$minute, $hour, $dom, $month, $dow = $parts

# Determine schedule type and parameters
function Get-ScheduleParams {
    # Every N minutes
    if ($minute -match '^\*/(\d+)$') {
        return @{
            Schedule = "MINUTE"
            Modifier = $Matches[1]
        }
    }

    # Every N hours
    if ($hour -match '^\*/(\d+)$') {
        return @{
            Schedule = "HOURLY"
            Modifier = $Matches[1]
        }
    }

    # Time for daily/weekly schedules
    $time = $null
    if ($minute -ne '*' -and $hour -ne '*') {
        $h = [int]$hour
        $m = [int]$minute
        $time = "{0:D2}:{1:D2}" -f $h, $m
    }

    # Weekly (specific day of week)
    if ($dow -ne '*' -and $dom -eq '*') {
        $dayMap = @{
            '0' = 'SUN'; '1' = 'MON'; '2' = 'TUE'; '3' = 'WED'
            '4' = 'THU'; '5' = 'FRI'; '6' = 'SAT'; '7' = 'SUN'
        }

        $days = @()
        if ($dow -match '(\d+)-(\d+)') {
            for ($i = [int]$Matches[1]; $i -le [int]$Matches[2]; $i++) {
                $days += $dayMap[[string]$i]
            }
        } else {
            foreach ($d in $dow -split ',') {
                $days += $dayMap[$d]
            }
        }

        return @{
            Schedule = "WEEKLY"
            Days = $days -join ','
            StartTime = $time
        }
    }

    # Monthly (specific day of month)
    if ($dom -ne '*') {
        return @{
            Schedule = "MONTHLY"
            Modifier = $dom
            StartTime = $time
        }
    }

    # Default to daily
    return @{
        Schedule = "DAILY"
        StartTime = $time
    }
}

$schedParams = Get-ScheduleParams

# Delete existing task if present
try {
    schtasks /Delete /TN $TaskName /F 2>$null
} catch {}

# Build schtasks command
$logFile = "$LogDir\$TaskId.log"
$taskCommand = "cmd /c `"cd /d `"$WorkDir`" && $Command >> `"$logFile`" 2>&1`""

$args = @(
    "/Create"
    "/TN", $TaskName
    "/TR", $taskCommand
    "/SC", $schedParams.Schedule
)

if ($schedParams.Modifier) {
    $args += @("/MO", $schedParams.Modifier)
}

if ($schedParams.StartTime) {
    $args += @("/ST", $schedParams.StartTime)
}

if ($schedParams.Days) {
    $args += @("/D", $schedParams.Days)
}

# Create the task
Write-Host "Creating scheduled task: $TaskName"
Write-Host "Command: schtasks $($args -join ' ')"

& schtasks @args

Write-Host ""
Write-Host "Task created successfully!"
Write-Host "Log file: $logFile"
Write-Host ""
Write-Host "To run the task manually:"
Write-Host "  schtasks /Run /TN `"$TaskName`""
Write-Host ""
Write-Host "To delete the task:"
Write-Host "  schtasks /Delete /TN `"$TaskName`" /F"
