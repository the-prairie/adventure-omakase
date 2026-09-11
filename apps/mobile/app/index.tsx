import { ConnectivityScreen } from '../src/connectivity-screen';
import { parseMobileEnvironment } from '../src/environment';

const environment = parseMobileEnvironment({
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
});

export default function IndexRoute() {
  return (
    <ConnectivityScreen apiBaseUrl={environment.EXPO_PUBLIC_API_BASE_URL} />
  );
}
