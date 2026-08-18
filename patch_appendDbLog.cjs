const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

code = code.replace(
`    await setDbData('databaseLogs', logs);
  } catch(e) {`,
`    await setDbData('databaseLogs', logs);
    console.log("APPEND LOG SUCCESS: ", logs.length);
  } catch(e) {
    console.error("APPEND LOG FAILED: ", e);`
);

fs.writeFileSync('src/routes/backup.routes.ts', code);
