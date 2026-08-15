import dotenv from "dotenv";

/* ============================================================================
   ENVIRONMENT, LOADED BEFORE ANYTHING READS IT

   Import this FIRST in any script, above `../lib/db`:

     import "./load-env";
     import { db } from "../lib/db";

   Why it is a module and not two lines at the top of the script: ES imports
   are hoisted and evaluated before the importing module's own statements, so

     import "dotenv/config";          // loads .env only
     import { db } from "../lib/db";  // ← reads TURSO_DATABASE_URL right here
     dotenv.config({ path: [".env.local", ".env"] });   // ← far too late

   quietly connects to the local SQLite file while looking like it read your
   real configuration. That failure is nasty because it does not throw: the
   script runs happily against the wrong database and reports success. It has
   now cost this project three separate debugging sessions — the FAL key, the
   drizzle config, and a seed that could not find a column that plainly
   existed. Loading through an imported module makes the order a fact of the
   module graph rather than something each script has to remember.

   Same precedence as Next: .env.local wins over .env.
   ========================================================================= */

dotenv.config({ path: [".env.local", ".env"], quiet: true });
