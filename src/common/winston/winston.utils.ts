import winston from 'winston';

const textFormat = {
  bold: (text: string) => `\x1B[1m${text}\x1B[0m`,
  green: (text: string) => `\x1B[32m${text}\x1B[39m`,
  yellow: (text: string) => `\x1B[33m${text}\x1B[39m`,
  red: (text: string) => `\x1B[31m${text}\x1B[39m`,
  magentaBright: (text: string) => `\x1B[95m${text}\x1B[39m`,
  cyanBright: (text: string) => `\x1B[96m${text}\x1B[39m`,
};

const formatRunner = () => {
  return `[${textFormat.magentaBright('Nest')}]`;
};

const formatTimestamp = (timestamp: string) => {
  return `${textFormat.cyanBright(new Date(timestamp).toLocaleString())}`;
};

const formatContext = (context?: string) => {
  return context ? `[${textFormat.yellow(context)}]` : '';
};

const formatMs = (ms: string) => {
  return `(${textFormat.yellow(ms)})`;
};

const formatStack = (stack: string) => {
  return stack ? `\n${stack}` : '';
};

export const winstonConsoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.printf(
      ({ level, message, timestamp, context, ms, stack }) => {
        return `${formatRunner()} ${process.pid} -- ${formatTimestamp(
          timestamp,
        )} ${level} ${formatContext(context)}: ${message} ${formatMs(
          ms,
        )}${formatStack(stack)}`;
      },
    ),
  ),
});

export const testingModule = {
  winstonConsoleTransport,
  textFormat,
  formatRunner,
  formatTimestamp,
  formatContext,
  formatMs,
  formatStack,
};
