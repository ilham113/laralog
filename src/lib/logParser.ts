export interface LaravelLog {
  id: string;
  timestamp: string;
  environment: string;
  level: 'DEBUG' | 'INFO' | 'NOTICE' | 'WARNING' | 'ERROR' | 'CRITICAL' | 'ALERT' | 'EMERGENCY';
  message: string;
  context: string;
  raw: string;
}

export interface LogFrequency {
  message: string;
  count: number;
  level: string;
}

export function parseLaravelLogs(rawContent: string): LaravelLog[] {
  // Laravel log pattern: [YYYY-MM-DD HH:MM:SS] environment.LEVEL: Message {"context":...}
  // This regex handles multi-line messages (stack traces) by using a negative lookahead for the next timestamp
  const logPattern = /\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] (\w+)\.(\w+): ([\s\S]*?)(?=\n\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]|$)/g;
  
  const logs: LaravelLog[] = [];
  let match;

  while ((match = logPattern.exec(rawContent)) !== null) {
    const [fullMatch, timestamp, environment, level, content] = match;
    
    // Try to separate message from context (JSON at the end)
    let message = content.trim();
    let context = "";
    
    const jsonMatch = content.match(/(\{.*\})\s*$/);
    if (jsonMatch) {
      context = jsonMatch[1];
      message = content.replace(jsonMatch[1], "").trim();
    }

    logs.push({
      id: Math.random().toString(36).substring(2, 9),
      timestamp,
      environment,
      level: level.toUpperCase() as any,
      message,
      context,
      raw: fullMatch
    });
  }

  return logs;
}

export function getFrequencies(logs: LaravelLog[]): LogFrequency[] {
  const freqMap = new Map<string, { count: number; level: string }>();

  logs.forEach(log => {
    // We group by message, but maybe truncate long messages or strip IDs to group better
    // For now, simple message grouping
    const key = log.message.split('\n')[0]; // Group by first line of message
    const existing = freqMap.get(key) || { count: 0, level: log.level };
    freqMap.set(key, { count: existing.count + 1, level: log.level });
  });

  return Array.from(freqMap.entries())
    .map(([message, data]) => ({
      message,
      count: data.count,
      level: data.level
    }))
    .sort((a, b) => b.count - a.count);
}
