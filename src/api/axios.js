import axios from 'axios';

const instance = axios.create({
    baseURL: import.meta.env.PROD ? '/api' : 'http://localhost:5000/api'
});

// Response interceptor to handle 401 errors
instance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('userInfo');
            // Check if we are on the login page already
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default instance;
