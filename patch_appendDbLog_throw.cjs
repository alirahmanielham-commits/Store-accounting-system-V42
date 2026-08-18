const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

code = code.replace(
`    console.error("APPEND LOG FAILED: ", e);
  }
};`,
`    console.error("APPEND LOG FAILED: ", e);
    throw e;
  }
};`
);

fs.writeFileSync('src/routes/backup.routes.ts', code);
