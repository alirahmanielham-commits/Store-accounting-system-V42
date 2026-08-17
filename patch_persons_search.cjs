const fs = require('fs');
let code = fs.readFileSync('src/components/persons/PersonsManager.tsx', 'utf8');

if (!code.includes("const [localSearchTerm, setLocalSearchTerm] = useState(personSearchTerm || '');")) {
  code = code.replace(
    'const [isBulkLoading, setIsBulkLoading] = useState(false);',
    'const [isBulkLoading, setIsBulkLoading] = useState(false);\n  const [localSearchTerm, setLocalSearchTerm] = useState(personSearchTerm || "");\n  useEffect(() => { setLocalSearchTerm(personSearchTerm || ""); }, [personSearchTerm]);\n  useEffect(() => {\n    const timer = setTimeout(() => {\n      if (localSearchTerm !== personSearchTerm) {\n        setPersonSearchTerm(localSearchTerm);\n        setPersonCurrentPage(1);\n      }\n    }, 400);\n    return () => clearTimeout(timer);\n  }, [localSearchTerm, personSearchTerm, setPersonSearchTerm, setPersonCurrentPage]);'
  );

  code = code.replace(
    /value=\{personSearchTerm\}\s*onChange=\{\(e\) => \{\s*setPersonSearchTerm\(e\.target\.value\);\s*setPersonCurrentPage\(1\);\s*\}\}/,
    'value={localSearchTerm}\n              onChange={(e) => setLocalSearchTerm(e.target.value)}'
  );
  
  // also handle "جستجو: ${personSearchTerm}" label in active filters
  // We should make sure the active filters still refer to personSearchTerm or local? personSearchTerm is fine, as it reflects applied filter.
  // Wait, clearAllFilters also does setPersonSearchTerm(''). localSearchTerm will be updated via the effect `useEffect(() => { setLocalSearchTerm(personSearchTerm || ""); }, [personSearchTerm]);`.
  
  fs.writeFileSync('src/components/persons/PersonsManager.tsx', code, 'utf8');
}
