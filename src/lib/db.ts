// =================================================================================================
// DATABASE ADAPTER
// =================================================================================================
// This file acts as a flexible database adapter.
//
// By default, it uses a simple JSON file (`prisma/db.json`) for data storage, which is
// perfect for development and prototyping as it requires no external database setup.
//
// =================================to=================================================================


// =================================================================================================
// PRISMA CLIENT IMPLEMENTATION (For Production with MySQL/Postgres/etc.)
// =================================================================================================
import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const libsql = createClient({
  url: `${process.env.TURSO_DATABASE_URL}`,
  authToken: `${process.env.TURSO_AUTH_TOKEN}`,
});

const adapter = new PrismaLibSQL(libsql)

const prismaClientSingleton = () => {
  return new PrismaClient({ adapter })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const db = globalThis.prisma ?? prismaClientSingleton()

export default db

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = db
}
