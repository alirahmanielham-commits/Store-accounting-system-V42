const fs = require('fs');

let checkCard = fs.readFileSync('src/components/financial/checks/CheckCardPage.tsx', 'utf8');

checkCard = checkCard.replace(
  `import { X, Check as CheckIcon, AlertCircle, RefreshCw, FileText, Printer, ArrowRight, User, History as HistoryIcon, Building2, Calendar, CheckCircle, ExternalLink } from 'lucide-react';`,
  `import { X, Check as CheckIcon, AlertCircle, RefreshCw, FileText, Printer, ArrowRight, User, History as HistoryIcon, Building2, Calendar, CheckCircle, ExternalLink, Search } from 'lucide-react';\nimport { useState } from 'react';`
);

checkCard = checkCard.replace(
  `export default function CheckCardPage({`,
  `export default function CheckCardPage({`
);

// We need to add state for activeTab and search/select
// Because regex replacement might be tricky, let's rewrite the layout of the modal.

