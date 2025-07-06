# Development Guidelines - RAG JS Agent App

## 🎯 **STRICT TYPESCRIPT DEVELOPMENT RULES**

### **Core Principle**: Always use the strictest possible TypeScript configuration to catch errors at compile-time rather than runtime.

---

## 📋 **MANDATORY DEVELOPMENT PRACTICES**

### 1. **Type Safety Requirements**
- ✅ **ALWAYS** define explicit types for function parameters and return values
- ✅ **NEVER** use `any` without explicit justification (use `unknown` instead)
- ✅ **ALWAYS** handle nullable/undefined values explicitly
- ✅ **NEVER** use non-null assertion (`!`) unless absolutely necessary
- ✅ **ALWAYS** use optional chaining (`?.`) and nullish coalescing (`??`)

### 2. **Variable and Import Management**
- ✅ **ALWAYS** prefix unused variables with underscore (`_variable`)
- ✅ **NEVER** leave unused imports in code
- ✅ **ALWAYS** use `const` instead of `let` when possible
- ✅ **NEVER** use `var`

### 3. **Error Handling**
- ✅ **ALWAYS** handle all possible error states
- ✅ **ALWAYS** provide meaningful error messages
- ✅ **NEVER** leave empty catch blocks
- ✅ **ALWAYS** prefix unused caught errors with underscore (`catch (_error)`)

### 4. **Object and Property Access**
- ✅ **ALWAYS** check for undefined before accessing object properties
- ✅ **ALWAYS** use optional chaining for nested property access
- ✅ **NEVER** assume objects are defined without checks

---

## 🔧 **TYPESCRIPT CONFIGURATION**

Our `tsconfig.json` is configured with maximum strictness:

```json
{
  "compilerOptions": {
    "strict": true,                      // Enable all strict mode family options
    "strictNullChecks": true,            // Catch null/undefined errors
    "strictFunctionTypes": true,         // Ensure function type safety
    "strictPropertyInitialization": true, // Require class properties to be initialized
    "noImplicitAny": true,              // Error on expressions with implied 'any'
    "noImplicitReturns": true,          // Error when not all code paths return
    "noUnusedLocals": true,             // Error on unused local variables
    "noUnusedParameters": true,         // Error on unused parameters
    "noUncheckedIndexedAccess": true,   // Add undefined to unverified index access
    "exactOptionalPropertyTypes": true   // Exact types for optional properties
  }
}
```

---

## 📝 **CODE EXAMPLES**

### ❌ **BAD PRACTICES** (Will cause errors with strict TypeScript)

```typescript
// DON'T: Uninitialized class properties
class MyClass {
  private service: SomeService; // ❌ Error: Property not initialized
}

// DON'T: Accessing potentially undefined properties
function processUser(user: User | undefined) {
  return user.name; // ❌ Error: Object possibly undefined
}

// DON'T: Unused variables
function calculate(a: number, b: number) {
  const unused = 42; // ❌ Error: Variable declared but never used
  return a + b;
}
```

### ✅ **GOOD PRACTICES** (Strict TypeScript compliant)

```typescript
// DO: Properly initialized class properties
class MyClass {
  private service: SomeService | undefined; // ✅ Explicitly undefined
  
  constructor() {
    // Check and initialize in constructor or methods
    if (someCondition) {
      this.service = new SomeService();
    }
  }
  
  useService(): void {
    if (!this.service) { // ✅ Explicit check before use
      throw new Error('Service not initialized');
    }
    this.service.doSomething();
  }
}

// DO: Safe property access
function processUser(user: User | undefined): string {
  if (!user) { // ✅ Explicit null check
    return 'Unknown user';
  }
  return user.name ?? 'No name'; // ✅ Nullish coalescing
}

// DO: Handle unused variables properly
function calculate(a: number, b: number): number {
  const _debug = 42; // ✅ Prefixed with underscore
  return a + b;
}

// DO: Proper error handling
try {
  riskyOperation();
} catch (_error) { // ✅ Prefixed unused error
  console.error('Operation failed');
}
```

---

## 🚀 **DEVELOPMENT WORKFLOW**

### **Before Every Commit:**
1. Run `npm run lint` - Fix all ESLint errors
2. Run `npm run build` - Ensure TypeScript compilation passes
3. Test all changed functionality
4. Verify no console errors in browser

### **Before Every Deployment:**
1. Run full test suite
2. Verify build passes with zero warnings
3. Check that all environment variables are properly typed
4. Ensure all external API integrations have proper error handling

---

## 📚 **RESOURCES**

- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)
- [ESLint TypeScript Rules](https://typescript-eslint.io/rules/)
- [Next.js TypeScript Guide](https://nextjs.org/docs/basic-features/typescript)

---

## 🎖️ **ENFORCEMENT**

These guidelines are **MANDATORY** for all development work. The build system is configured to **FAIL** if any of these rules are violated, ensuring code quality and preventing runtime errors in production.

**Remember**: It's better to spend 5 minutes fixing a TypeScript error than 5 hours debugging a production runtime issue!
