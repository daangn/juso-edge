import type { Handler, Context as WorktopContext } from 'worktop';
import type { Reporter, Tracker } from 'workers-logger';
import { enable, track as trackReporter } from 'workers-logger';

export type { Reporter, Tracker as ReporterTracker };

export interface Context extends WorktopContext {
  reporter: Tracker,
}

export const track = (reporter: Reporter, name: string): Handler<Context> => {
  enable('*');
  return (request, context) => {
    const trackedReporter = trackReporter(request, name, reporter);
    context.reporter = trackedReporter;
    context.defer(res => {
      context.waitUntil(trackedReporter.report(res));
    });
  };
};
