import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// React Native Localhost Bridge:
// Configured explicitly for Physical Phone LAN Testing
const getBaseUrl = () => {
    // Ngrok Tunnel for remote physical device testing and APK builds
    return 'https://uncouple-plant-contend.ngrok-free.dev';
};

const API = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token securely pulled from device storage
API.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
        console.error("Failed to retrieve auth token", err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Optional Response interceptor to handle auto-logout on 401s globally
API.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      console.warn('Unauthorized → App should route to Login');
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      // Note: Actual routing kickout is handled at the provider/navigator level
    }
    return Promise.reject(err);
  }
);

export default API;
