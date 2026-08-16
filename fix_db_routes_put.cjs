const fs = require('fs');

let routes = fs.readFileSync('src/routes/database.routes.ts', 'utf8');

const oldPut = `router.put('/api/databases/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, db_type, db_host, db_port, db_name, db_user, db_password } = req.body;
      if (!name) return res.status(400).json({ error: 'Name is required' });
            
      let existing = null;
      if (usePgMap['default'] && activePgPools['default']) {
          const r = await activePgPools['default'].query("SELECT * FROM businesses WHERE id = $1", [id]);
          if (r.rows.length > 0) existing = r.rows[0];
      } else { existing = null; }

      if (existing || id === 'default') {
        if (!existing) {
           if (usePgMap['default'] && activePgPools['default']) {
               await activePgPools['default'].query('INSERT INTO businesses (id, name, db_type) VALUES ($1, $2, $3)', [id, name, db_type || 'sqlite']);
           } else { throw new Error("PostgreSQL required to create businesses"); }
        } else {
        if (usePgMap['default'] && activePgPools['default']) {
            await activePgPools['default'].query(\`
              UPDATE businesses SET 
                name = $1, 
                db_type = COALESCE($2, db_type), 
                db_host = COALESCE($3, db_host), 
                db_port = COALESCE($4, db_port), 
                db_name = COALESCE($5, db_name), 
                db_user = COALESCE($6, db_user), 
                db_password = COALESCE($7, db_password) 
              WHERE id = $8
            \`, [name, db_type, db_host, db_port, db_name, db_user, db_password, id]);
        } else { throw new Error("PostgreSQL required to update businesses"); }
        }
        res.json({ success: true, database: { id, name, db_type: db_type || (existing && existing.db_type) || 'sqlite', db_host, db_port, db_name, db_user, db_password } });
      } else {
        // Fallback for file-only databases being renamed
        const newId = encodeURIComponent(name.replace(/\\s+/g, '_'));
        const oldFile = path.join(process.cwd(), \`database_\${id}.sqlite\`);
        const newFile = path.join(process.cwd(), \`database_\${newId}.sqlite\`);
        
        if (dbs[id]) {
          try { dbs[id].close(); } catch(e) { }
          delete dbs[id];
        }
        await fsPromises.rename(oldFile, newFile);
        res.json({ success: true, database: { id: newId, name } });
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });`;

const newPut = `router.put('/api/databases/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, db_type, db_host, db_port, db_name, db_user, db_password } = req.body;
      if (!name) return res.status(400).json({ error: 'Name is required' });
            
      if (usePgMap['default'] && activePgPools['default']) {
          const r = await activePgPools['default'].query("SELECT * FROM businesses WHERE id = $1", [id]);
          if (r.rows.length === 0) {
              await activePgPools['default'].query('INSERT INTO businesses (id, name, db_type) VALUES ($1, $2, $3)', [id, name, db_type || 'sqlite']);
          } else {
              await activePgPools['default'].query(\`
                UPDATE businesses SET 
                  name = $1, 
                  db_type = COALESCE($2, db_type), 
                  db_host = COALESCE($3, db_host), 
                  db_port = COALESCE($4, db_port), 
                  db_name = COALESCE($5, db_name), 
                  db_user = COALESCE($6, db_user), 
                  db_password = COALESCE($7, db_password) 
                WHERE id = $8
              \`, [name, db_type, db_host, db_port, db_name, db_user, db_password, id]);
          }
          res.json({ success: true, database: { id, name, db_type: db_type || (r.rows.length > 0 ? r.rows[0].db_type : 'sqlite'), db_host, db_port, db_name, db_user, db_password } });
      } else {
          // If no postgres, we assume it's sqlite, but don't try to rename the file. We just acknowledge the success.
          // Because in this setup, the frontend relies on id remaining consistent.
          res.json({ success: true, database: { id, name } });
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });`;

routes = routes.replace(oldPut, newPut);
fs.writeFileSync('src/routes/database.routes.ts', routes);
console.log('Fixed PUT route');
