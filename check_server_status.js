import axios from 'axios';

async function check() {
    try {
        const res = await axios.get('http://localhost:5000/api');
        console.log('Server is UP:', res.data);
    } catch (err) {
        console.error('Server is DOWN or unreachable:', err.message);
    }
}
check();
