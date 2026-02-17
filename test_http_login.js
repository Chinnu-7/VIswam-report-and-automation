import axios from 'axios';

async function test() {
    try {
        const res = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@viswam.com',
            password: 'admin123'
        });
        console.log('Login Result:', res.data);
    } catch (err) {
        console.error('Login Failed:', err.response?.data || err.message);
    }
}
test();
