import { Project, SyntaxKind, VariableDeclarationKind } from 'ts-morph';
import fs from 'fs';
import path from 'path';

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
});
const sourceFile = project.addSourceFileAtPath('server.ts');

const srcDbPath = 'src/db';
const srcMiddlewarePath = 'src/middleware';
const srcRoutesPath = 'src/routes';
const srcWorkerPath = 'src/worker'; // As requested by user

[srcDbPath, srcMiddlewarePath, srcRoutesPath, srcWorkerPath].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Create files
const connectionFile = project.createSourceFile(`${srcDbPath}/connection.ts`, '', { overwrite: true });
const schemaSyncFile = project.createSourceFile(`${srcDbPath}/schema-sync.ts`, '', { overwrite: true });
const kvStoreFile = project.createSourceFile(`${srcDbPath}/kv-store.ts`, '', { overwrite: true });
const migrationFile = project.createSourceFile(`${srcDbPath}/migration.ts`, '', { overwrite: true });

const authMiddlewareFile = project.createSourceFile(`${srcMiddlewarePath}/auth.middleware.ts`, '', { overwrite: true });
const storeContextMiddlewareFile = project.createSourceFile(`${srcMiddlewarePath}/store-context.middleware.ts`, '', { overwrite: true });

const authRoutesFile = project.createSourceFile(`${srcRoutesPath}/auth.routes.ts`, '', { overwrite: true });
const setupRoutesFile = project.createSourceFile(`${srcRoutesPath}/setup.routes.ts`, '', { overwrite: true });
const databaseRoutesFile = project.createSourceFile(`${srcRoutesPath}/database.routes.ts`, '', { overwrite: true });
const dataRoutesFile = project.createSourceFile(`${srcRoutesPath}/data.routes.ts`, '', { overwrite: true });
const backupRoutesFile = project.createSourceFile(`${srcRoutesPath}/backup.routes.ts`, '', { overwrite: true });
const migrationRoutesFile = project.createSourceFile(`${srcRoutesPath}/migration.routes.ts`, '', { overwrite: true });
const reportsRoutesFile = project.createSourceFile(`${srcRoutesPath}/reports.routes.ts`, '', { overwrite: true });
const systemRoutesFile = project.createSourceFile(`${srcRoutesPath}/system.routes.ts`, '', { overwrite: true });
const miscRoutesFile = project.createSourceFile(`${srcRoutesPath}/misc.routes.ts`, '', { overwrite: true });
const syncWorkerFile = project.createSourceFile(`${srcWorkerPath}/sync-worker.ts`, '', { overwrite: true });
const finalServerFile = project.createSourceFile(`server.new.ts`, '', { overwrite: true });

// Move top level items to files
// Helper to move a function
function moveFunction(name: string, targetFile: any) {
  const func = sourceFile.getFunction(name);
  if (func) {
    targetFile.addFunction(func.getStructure());
    const addedFunc = targetFile.getFunction(name);
    addedFunc.setIsExported(true);
    func.remove();
  }
}

// Helper to move a variable declaration
function moveVariable(name: string, targetFile: any) {
  const varStmt = sourceFile.getVariableStatement(stmt => stmt.getDeclarations().some(d => d.getName() === name));
  if (varStmt) {
    const decls = varStmt.getDeclarations();
    const decl = decls.find(d => d.getName() === name);
    if (decl) {
      targetFile.addVariableStatement({
        declarationKind: VariableDeclarationKind.Const,
        isExported: true,
        declarations: [{
          name: decl.getName(),
          initializer: decl.getInitializer()?.getText(),
          type: decl.getTypeNode()?.getText()
        }]
      });
      // Removing the whole statement might remove other variables if they are comma separated,
      // but assuming they are single declarations.
      varStmt.remove();
    }
  }
}

// src/db/connection.ts
['storeContext', 'DATA_FILE', 'SQLITE_FILE', 'dbs', 'activePgPools', 'usePgMap', 'pendingPgPools', 'DB_CONFIG_FILE'].forEach(v => moveVariable(v, connectionFile));
['getDb', 'loadPgPoolForStore', 'getActivePgPool', 'isPgActive', 'connectPgDb'].forEach(f => moveFunction(f, connectionFile));
connectionFile.addImportDeclarations([
  { moduleSpecifier: 'dotenv/config' },
  { namedImports: ['AsyncLocalStorage'], moduleSpecifier: 'node:async_hooks' },
  { namedImports: ['DatabaseSync'], moduleSpecifier: 'node:sqlite' },
  { defaultImport: 'path', moduleSpecifier: 'path' },
  { defaultImport: 'fsPromises', moduleSpecifier: 'fs/promises' },
  { namedImports: ['Client', 'Pool'], moduleSpecifier: 'pg' },
  { namedImports: ['ensurePostgresTables'], moduleSpecifier: './schema-sync' }
]);

// src/db/schema-sync.ts
['KNOWN_TABLES', 'tableSchemas'].forEach(v => moveVariable(v, schemaSyncFile));
['syncTableSchema', 'ensurePostgresTables'].forEach(f => moveFunction(f, schemaSyncFile));
schemaSyncFile.addImportDeclarations([
  { namedImports: ['getActivePgPool', 'isPgActive'], moduleSpecifier: './connection' },
]);

// src/db/kv-store.ts
['innerGetDbData', 'innerSetDbData', 'handleRelations', 'getDbData', 'setDbData', 'getAllDbData'].forEach(f => moveFunction(f, kvStoreFile));
kvStoreFile.addImportDeclarations([
  { namedImports: ['getDb', 'isPgActive', 'getActivePgPool'], moduleSpecifier: './connection' },
  { namedImports: ['KNOWN_TABLES', 'tableSchemas', 'syncTableSchema'], moduleSpecifier: './schema-sync' },
]);

// src/db/migration.ts
['migrateSqliteToPostgres', 'initDB'].forEach(f => moveFunction(f, migrationFile));
migrationFile.addImportDeclarations([
  { defaultImport: 'path', moduleSpecifier: 'path' },
  { defaultImport: 'fsPromises', moduleSpecifier: 'fs/promises' },
  { namedImports: ['getDb', 'loadPgPoolForStore', 'isPgActive', 'getActivePgPool', 'storeContext', 'DB_CONFIG_FILE', 'DATA_FILE'], moduleSpecifier: './connection' },
  { namedImports: ['KNOWN_TABLES', 'tableSchemas', 'syncTableSchema', 'ensurePostgresTables'], moduleSpecifier: './schema-sync' },
  { namedImports: ['handleRelations'], moduleSpecifier: './kv-store' },
]);

// Now for middleware and routes... this is inside startServer() mostly!
// Let's parse startServer() body.
const startServerFunc = sourceFile.getFunction('startServer');
if (!startServerFunc) throw new Error("startServer not found");

// We can just textually extract it and write it because TS Morph might struggle with extracting partial body chunks easily.
const serverBody = startServerFunc.getBody()!.getText();
// I will just use regex to extract routes from the text, it's easier and we will fix imports later.
console.log('Script loaded.');
