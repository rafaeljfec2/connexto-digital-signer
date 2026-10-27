/**
 * When ENABLE_SCHEDULER is the string "false", Nest ScheduleModule and
 * ReminderSchedulerService must not be registered. Any other value (including
 * unset) keeps the current single-process cron behavior.
 */
export function isSchedulerEnabled(): boolean {
  return process.env['ENABLE_SCHEDULER'] !== 'false';
}
