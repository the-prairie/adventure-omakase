/** DETERMINISTIC TEST PROVIDER. Never imported by the production Worker. */
export const QUOTE =
  'Synthetic source evidence: this place has an exhibition and a public entrance. Opening times and availability must be checked separately.';
export function fixtureModel({ onCall, delay = 0, fail = false } = {}) {
  const calls = [];
  return {
    calls,
    async run(_model, input) {
      calls.push(input);
      await onCall?.(input);
      if (delay) await new Promise((r) => setTimeout(r, delay));
      if (fail) throw new Error('Synthetic provider failure');
      const request = JSON.parse(
        input.messages.find((m) => m.role === 'user').content,
      ).request;
      const region = request.region,
        ids = [region + '-001', region + '-002', region + '-003'];
      const usage = { prompt_tokens: 120, completion_tokens: 200, neurons: 18 };
      const results =
        JSON.parse(input.messages.find((m) => m.role === 'user').content)
          .checkedEvidence ||
        input.messages
          .filter((m) => m.role === 'tool')
          .flatMap((m) => JSON.parse(m.content));
      if (!results.length)
        return {
          choices: [
            {
              message: {
                content: '',
                tool_calls: [
                  {
                    id: 'call-sources',
                    type: 'function',
                    function: {
                      name: request.prompt.includes('forbidden tool')
                        ? 'execute_sql'
                        : 'check_sources',
                      arguments: JSON.stringify({ discoveryIds: ids }),
                    },
                  },
                ],
              },
            },
          ],
          usage,
        };
      const result = {
        question: '',
        options: ids
          .slice(0, request.mode === 'check' ? 1 : 2)
          .map((discoveryId, i) => ({
            discoveryId,
            reason:
              'Synthetic fixture: matches your explicit preference for unusual places.',
            effort: 'Two hours, then lunch; travel time is an estimate.',
            uncertainty:
              'Synthetic evidence only. Booking availability is not checked.',
            citations: [discoveryId, ids[2]].map((id) => ({
              sourceId: results.find((s) => s.discoveryId === id).id,
              quote: request.prompt.includes('fabricated citation')
                ? 'Fabricated statement not in the source.'
                : QUOTE,
            })),
            draft: {
              title: 'Synthetic Osaka activity and lunch ' + (i + 1),
              start: '10:00',
              end: '13:30',
              description:
                'Synthetic fixture. Times, cost and meeting points are estimates to confirm. No tickets booked.',
              cost: 'Estimate to check',
              effort: 'easy',
              segments: [
                {
                  discoveryId,
                  label: 'Unusual activity',
                  start: '10:00',
                  end: '12:00',
                  meeting: 'Synthetic activity entrance',
                },
                {
                  discoveryId: ids[2],
                  label: 'Just lunch',
                  start: '12:30',
                  end: '13:30',
                  meeting: 'Synthetic lunch front door',
                },
              ],
            },
          })),
      };
      return {
        choices: [{ message: { content: JSON.stringify(result) } }],
        usage,
      };
    },
  };
}
