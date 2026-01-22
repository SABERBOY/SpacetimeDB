# Benchmark Failure Analysis

Generated from: `/__w/SpacetimeDB/SpacetimeDB/tools/xtask-llm-benchmark/../../docs/llms/docs-benchmark-details.json`

## Summary

- **Total failures analyzed**: 35

---

# Analysis of SpacetimeDB Benchmark Test Failures

---

## Rust / rustdoc_json Failures

### Compile/Publish Errors 

#### t_002_scheduled_table & t_017_scheduled_columns

**1. The generated code**:
```rust
use spacetimedb::{table, reducer, ReducerContext, Table, ScheduleAt};

#[table(name = tick_timer, schedule(reducer = tick, column = scheduled_at))]
pub struct TickTimer {
    #[primary_key]
    #[auto_inc]
    scheduled_id: u64,
    scheduled_at: ScheduleAt,
}

#[reducer(init)]
pub fn init(ctx: &ReducerContext) {
    if ctx.db.tick_timer().count() == 0 {
        ctx.db.tick_timer().insert(TickTimer {
            scheduled_id: 0,
            scheduled_at: ScheduleAt::repeat_micros(50_000),
        });
    }
}

#[reducer]
pub fn tick(_ctx: &ReducerContext, _row: TickTimer) {
}
```

**2. The golden example**:
```rust
use spacetimedb::{reducer, table, ReducerContext, ScheduleAt, Table};
use std::time::Duration;

#[table(name = tick_timer, scheduled(tick))]
pub struct TickTimer {
    #[primary_key]
    #[auto_inc]
    pub scheduled_id: u64,
    pub scheduled_at: ScheduleAt,
}

#[reducer]
pub fn tick(_ctx: &ReducerContext, _schedule: TickTimer) {
}

#[reducer(init)]
pub fn init(ctx: &ReducerContext) {
    let every_50ms: ScheduleAt = Duration::from_millis(50).into();
    ctx.db.tick_timer().insert(TickTimer {
        scheduled_id: 0,
        scheduled_at: every_50ms,
    });
}
```

**3. The error**: `publish_error: spacetime publish failed (exit=1)`

**4. Explain the difference**: 
   - Incorrect usage of `ScheduleAt`. The LLM used `repeat_micros` instead of `Interval` followed by the proper time conversion.
   - Missing `pub` visibility modifier in struct fields.

**5. Root cause**: The documentation might not adequately clarify the proper way to define scheduled behaviors or struct field visibility for SpacetimeDB structures.

**6. Recommendation**: Update the documentation to include:
   - Detailed examples showing how to specify time intervals for scheduling.
   - Emphasize the importance of the `pub` modifier for struct fields to ensure accessibility in the Spacetime context.

---

### Other Failures

#### t_003_struct_in_table

**1. The generated code**:
```rust
use spacetimedb::{table, reducer, ReducerContext, SpacetimeType, Table};

#[derive(SpacetimeType)]
pub struct Position {
    x: i32,
    y: i32,
}

#[table(name = entity)]
pub struct Entity {
    #[primary_key]
    id: i32,
    pos: Position,
}

#[reducer(init)]
pub fn init(_ctx: &ReducerContext) {
}

#[reducer]
pub fn add_entity(ctx: &ReducerContext, id: i32, x: i32, y: i32) {
    ctx.db.entity().insert(Entity { id, pos: Position { x, y } });
}
```

**2. The golden example**:
```rust
use spacetimedb::{table, SpacetimeType};

#[derive(SpacetimeType, Clone, Debug)]
pub struct Position {
    pub x: i32,
    pub y: i32,
}

#[table(name = entity)]
pub struct Entity {
    #[primary_key]
    pub id: i32,
    pub pos: Position,
}
```

**3. The error**: `schema_parity: reducers differ - expected [], got ["add_entity()", "init()"]`

**4. Explain the difference**: 
   - Missing `pub` visibility modifier on struct fields and the `Clone` and `Debug` traits on `Position` struct, which are required for schema parity.

**5. Root cause**: The documentation may not emphasize the need for visibility modifiers and certain traits on struct types participating in the SpacetimeDB schema.

**6. Recommendation**: Revise documentation to:
   - Clarify visibility requirements for struct members.
   - Specify required traits for types that will be used in SpacetimeDB schemas.

---

### t_012_spacetime_product_type & t_013_spacetime_sum_type

#### Common Sections

**1. The generated code**:
```rust
use spacetimedb::{ReducerContext, Table, SpacetimeType};

#[derive(SpacetimeType)]
pub struct Score {
    left: i32,
    right: i32,
}

#[spacetimedb::table(name = result)]
pub struct ResultRow {
    #[primary_key]
    id: i32,
    value: Score,
}

#[spacetimedb::reducer]
pub fn set_score(ctx: &ReducerContext, id: i32, left: i32, right: i32) {
    ctx.db.result().insert(ResultRow { id, value: Score { left, right } });
}
```

**2. The golden example**:
```rust
use spacetimedb::{reducer, table, ReducerContext, SpacetimeType, Table};

#[derive(SpacetimeType, Clone, Debug)]
pub struct Score {
    pub left: i32,
    pub right: i32,
}

#[table(name = result)]
pub struct ResultRow {
    #[primary_key]
    pub id: i32,
    pub value: Score,
}

#[reducer]
pub fn set_score(ctx: &ReducerContext, id: i32, left: i32, right: i32) {
    ctx.db.result().insert(ResultRow { id, value: Score { left, right } });
}
```

**3. The error**: `no such table: result`

**4. Explain the difference**: Missing `pub` visibility modifier for struct fields, required for correctly accessing the data schema.

**5. Root cause**: Lack of clarity on the need for visibility modifiers in the context of SpacetimeDB.

**6. Recommendation**: Enhance the documentation to clearly state the need for public visibility in struct fields used with SpacetimeDB.

---

### t_016_sum_type_columns

#### Common Sections

**1. The generated code**:
```rust
use spacetimedb::{ReducerContext, SpacetimeType, Table};

#[derive(SpacetimeType)]
pub struct Rect {
    width: i32,
    height: i32,
}

#[derive(SpacetimeType)]
pub enum Shape {
    Circle(i32),
    Rectangle(Rect),
}

#[spacetimedb::table(name = drawing)]
pub struct Drawing {
    #[primary_key]
    id: i32,
    a: Shape,
    b: Shape,
}
```

**2. The golden example**:
```rust
use spacetimedb::{reducer, table, ReducerContext, SpacetimeType, Table};

#[derive(SpacetimeType, Clone, Debug)]
pub struct Rect {
    pub width: i32,
    pub height: i32,
}

#[derive(SpacetimeType, Clone, Debug)]
pub enum Shape {
    Circle(i32),
    Rectangle(Rect),
}

#[table(name = drawing)]
pub struct Drawing {
    #[primary_key]
    pub id: i32,
    pub a: Shape,
    pub b: Shape,
}
```

**3. The error**: `no such table: drawings`

**4. Explain the difference**: Again, missing `pub` visibility modifiers in both structs.

**5. Root cause**: The SpacetimeDB documentation might not emphasize the visibility requirement for types that will be stored in the database.

**6. Recommendation**: Specific documentation fixes should focus on explaining field visibility in the context of schemas.

---

## Rust / docs Failures

### Timeouts & Other Errors 

#### t_000_empty_reducers

**1. The generated code**:
```rust
use spacetimedb::ReducerContext;

#[spacetimedb::reducer]
pub fn empty_reducer_no_args(ctx: &ReducerContext) {
}

#[spacetimedb::reducer]
pub fn empty_reducer_with_int(ctx: &ReducerContext, count: i32) {
}
```

**2. The golden example**:
```rust
use spacetimedb::{reducer, ReducerContext};

#[reducer]
pub fn empty_reducer_no_args(ctx: &ReducerContext) -> Result<(), String> {
    Ok(())
}
```

**3. The error**: `schema_parity: describe failed`

**4. Explain the difference**: The generated code does not return a `Result`, while the golden example requires a `Result` to conform to expected patterns.

**5. Root cause**: Documentation lacks clarity on the function signature requirements for reducers.

**6. Recommendation**: Update the documentation to illustrate the necessity for returning `Result` in reducer function signatures.

---

## C# / docs Failures

### Errors in Structure and Definition

#### t_013_spacetime_sum_type & t_014_elementary_columns

**1. The generated code**:
```csharp
using SpacetimeDB;
using SpacetimeDB.Types;

public static partial class Module
{
    [SpacetimeDB.Type]
    public partial struct Circle
    {
        public int Radius;
    }

    [SpacetimeDB.Type]
    public partial struct Rectangle
    {
        public int Width;
        public int Height;
    }
}
```

**2. The golden example**:
```csharp
using SpacetimeDB;

public static partial class Module
{
    [Type]
    public partial struct Circle { public int Radius; }

    [Type]
    public partial struct Rectangle { public int Width; public int Height; }
}
```

**3. The error**: Various errors related to visibility and schema consistency.

**4. Explain the difference**: Missing visibility modifiers and incorrect struct definitions.

**5. Root cause**: Documentation may not provide clear guidance on struct visibility, especially for public API usage.

**6. Recommendation**: Clarify the documentation on the requirements for struct visibility and annotations in C#.

---

This structured analysis provides actionable recommendations to improve the documentation and ensure developers can implement SpacetimeDB components without encountering recurrent issues.
