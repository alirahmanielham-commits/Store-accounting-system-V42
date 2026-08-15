const fs = require('fs');

let lines = fs.readFileSync('src/routes/auth.routes.ts', 'utf8').split('\n');
// We want to replace lines 52 to 60.

const goodBlock = `function finalizeLogin(res: any, user: any) {
     const tokenVersion = user.tokenVersion || 1;
     const accessToken = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
     const refreshToken = jwt.sign({ username: user.username, tokenVersion }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
     
     res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/auth/refresh' });
     
     const userWithoutPwd = { ...user };
     delete userWithoutPwd.password;
     delete userWithoutPwd.currentOTP;
     res.json({ accessToken, user: userWithoutPwd });
}

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-2024';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super-secret-jwt-refresh-key-2024';
`;

lines.splice(51, 10, goodBlock);
fs.writeFileSync('src/routes/auth.routes.ts', lines.join('\n'));

