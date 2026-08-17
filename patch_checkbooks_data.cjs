const fs = require('fs');
let code = fs.readFileSync('src/components/financial/CheckbooksManager.tsx', 'utf8');

const importData = "import { getCheckbooks as fetchCheckbooks, getAccounts } from '../../services/dataService';\nimport { useEffect } from 'react';";

if (!code.includes("fetchCheckbooks")) {
  code = code.replace("import React, { useState } from 'react';", "import React, { useState, useEffect } from 'react';\nimport { getCheckbooks as fetchCheckbooks, getAccounts } from '../../services/dataService';");

  const effectCode = `
  const [localCheckbooks, setLocalCheckbooks] = useState<any[]>(props.checkbooks || []);
  const [localAccounts, setLocalAccounts] = useState<any[]>(props.accounts || []);
  
  useEffect(() => {
    if (!props.checkbooks) fetchCheckbooks().then(res => setLocalCheckbooks(res || []));
    if (!props.accounts) getAccounts().then(res => setLocalAccounts(res || []));
  }, [props.checkbooks, props.accounts]);

  const checkbooks = props.checkbooks || localCheckbooks;
  const accounts = props.accounts || localAccounts;
  const setCheckbooks = props.setCheckbooks || setLocalCheckbooks;
`;

  code = code.replace(/const \{ setIssuedCheckbookFilter, setActiveSubTab, storeSettings, showNotification \} = props;/, 
    'const { setIssuedCheckbookFilter, setActiveSubTab, storeSettings, showNotification } = props;\n' + effectCode);

  fs.writeFileSync('src/components/financial/CheckbooksManager.tsx', code, 'utf8');
}
