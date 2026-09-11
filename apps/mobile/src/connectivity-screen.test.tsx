import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { ConnectivityScreen } from './connectivity-screen';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe('ConnectivityScreen', () => {
  it('shows loading and then a connected state', async () => {
    let resolveFetch: ((response: Response) => void) | undefined;
    globalThis.fetch = jest.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const view = await render(
      <ConnectivityScreen apiBaseUrl="http://api.test" />,
    );

    expect(view.getByLabelText('Checking API connection')).toBeOnTheScreen();
    await act(() => {
      resolveFetch?.({
        ok: true,
        json: jest.fn().mockResolvedValue({
          status: 'ok',
          service: 'adventure-omakase-api',
          version: '0.0.0',
        }),
      } as unknown as Response);
    });
    expect(await view.findByText('Connected')).toBeOnTheScreen();
  });

  it.each([
    ['a failed request', () => Promise.reject(new Error('offline'))],
    [
      'a malformed response',
      () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'wrong' }),
        }),
    ],
  ])('handles %s safely and retries', async (_case, firstResponse) => {
    globalThis.fetch = jest
      .fn()
      .mockImplementationOnce(firstResponse)
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          status: 'ok',
          service: 'adventure-omakase-api',
          version: '0.0.0',
        }),
      });

    const view = await render(
      <ConnectivityScreen apiBaseUrl="http://api.test" />,
    );

    expect(await view.findByText('Unavailable')).toBeOnTheScreen();
    await fireEvent.press(
      view.getByRole('button', { name: 'Retry API connection' }),
    );

    await waitFor(() => expect(view.getByText('Connected')).toBeOnTheScreen());
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});
