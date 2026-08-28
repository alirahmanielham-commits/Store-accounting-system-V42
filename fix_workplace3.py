import re

with open('src/components/payroll/WorkplaceManagerModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I will replace the whole fetchWorkplaces block up to useEffect
replacement = """  const fetchWorkplaces = async () => {
    setLoading(true);
    try {
      const data = await getWorkplaces();
      if (data && data.length === 0) {
        let storeName = storeSettings?.storeName || 'کسب و کار';
        try {
          const activeStoreId = localStorage.getItem('activeStoreId');
          if (activeStoreId) {
            const dbsRes = await fetch('/api/databases');
            const dbsData = await dbsRes.json();
            if (dbsData.success && dbsData.databases) {
              const currentDb = dbsData.databases.find((d: any) => d.id === activeStoreId);
              if (currentDb && currentDb.name) {
                storeName = currentDb.name;
              }
            }
          }
        } catch (e) {
          console.error('Error fetching businesses for default', e);
        }

        const defaultWorkplace = {
          id: generateId(),
          code: '1',
          name: storeName,
          employerName: '',
          postalCode: '',
          address: '',
          branchCode: '',
          branchName: '',
          isActive: true
        };
        await addWorkplace(defaultWorkplace);
        setWorkplaces([defaultWorkplace]);
      } else {
        setWorkplaces(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

"""

# find index of "const fetchWorkplaces ="
start_idx = content.find("  const fetchWorkplaces = async () => {")
# find index of "useEffect(() => {"
end_idx = content.find("  useEffect(() => {")

new_content = content[:start_idx] + replacement + content[end_idx:]

with open('src/components/payroll/WorkplaceManagerModal.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
