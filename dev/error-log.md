Test Database Insert Formats

Test Different Insert Formats

Testing different insert formats...



Test 1: Scientific notation

&nbsp; Value: 5e-10

&nbsp; Type: number

&nbsp; String: "5e-10"

&nbsp; > 0? true

&nbsp; ❌ Failed: new row for relation "trades" violates check constraint "trades\_total\_btc\_check"



Test 2: Fixed decimal

&nbsp; Value: 5e-10

&nbsp; Type: number

&nbsp; String: "5e-10"

&nbsp; > 0? true

&nbsp; ❌ Failed: new row for relation "trades" violates check constraint "trades\_total\_btc\_check"



Test 3: String conversion

&nbsp; Value: 5e-10

&nbsp; Type: number

&nbsp; String: "5e-10"

&nbsp; > 0? true

&nbsp; ❌ Failed: new row for relation "trades" violates check constraint "trades\_total\_btc\_check"



Test 4: Number constructor

&nbsp; Value: 5e-10

&nbsp; Type: number

&nbsp; String: "5e-10"

&nbsp; > 0? true

&nbsp; ❌ Failed: new row for relation "trades" violates check constraint "trades\_total\_btc\_check"



Test 5: Explicit decimal

&nbsp; Value: 5e-10

&nbsp; Type: number

&nbsp; String: "5e-10"

&nbsp; > 0? true

&nbsp; ❌ Failed: new row for relation "trades" violates check constraint "trades\_total\_btc\_check"



Test 6: Large decimal

&nbsp; Value: 0.000001

&nbsp; Type: number

&nbsp; String: "0.000001"

&nbsp; > 0? true

&nbsp; ✅ Success!



Final Test: Exact value from debug (5e-10)

&nbsp; Original: 5e-10

&nbsp; Processed: 5e-10

&nbsp; Are they equal? true

&nbsp; ❌ Failed: new row for relation "trades" violates check constraint "trades\_total\_btc\_check"

