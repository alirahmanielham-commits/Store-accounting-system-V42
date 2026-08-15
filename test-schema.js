const { z } = require('zod');
const loginSchema = z.object({ username: z.string().min(3), password: z.string().min(4) });
try {
  loginSchema.parse({ username: 'admin', password: 'admin' });
  console.log("Success");
} catch (e) {
  console.log("Error:", e.errors);
}
