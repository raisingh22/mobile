const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }
  // 10.219.117.165 is the computer's local IP address.
  // Using the local IP ensures that both physical devices and simulators/emulators
  // on the same local network can connect to the backend server.
  return 'http://10.219.117.165:3000';
};

export const API_URL = `${getBaseUrl()}/api/v1`;
