# Warp Development Rules

## 🎯 **MANDATORY RULE: STRICT TYPESCRIPT DEVELOPMENT**

### **Rule ID**: `STRICT_TYPESCRIPT_MANDATORY`
### **Priority**: `HIGHEST`
### **Persistence**: `ALL_FUTURE_WARP_CONVERSATIONS`

---

## 📋 **ENFORCEMENT REQUIREMENTS**

### **1. TypeScript Configuration**
- ✅ **ALWAYS** use strict TypeScript configuration with all safety checks enabled
- ✅ **ALWAYS** enable `strictNullChecks`, `noImplicitAny`, `noImplicitReturns`
- ✅ **ALWAYS** use `noUncheckedIndexedAccess` for array/object safety
- ✅ **NEVER** allow uninitialized class properties without explicit undefined types

### **2. Code Safety Patterns**
- ✅ **ALWAYS** check for undefined/null before property access
- ✅ **ALWAYS** use optional chaining (`?.`) instead of manual checks
- ✅ **ALWAYS** use nullish coalescing (`??`) instead of logical OR for defaults
- ✅ **NEVER** use non-null assertion (`!`) without explicit justification
- ✅ **ALWAYS** handle all error cases explicitly

### **3. Development Workflow**
- ✅ **ALWAYS** run `npm run lint` before any commits
- ✅ **ALWAYS** fix TypeScript errors before proceeding with new features
- ✅ **ALWAYS** treat ESLint errors as blocking (not just warnings)
- ✅ **ALWAYS** prefix unused variables with underscore (`_variable`)

### **4. Type Management**
- ✅ **PREFER** proper types over `any` (use `unknown` when necessary)
- ✅ **ALWAYS** define explicit return types for functions
- ✅ **ALWAYS** use interfaces instead of type aliases for object shapes
- ✅ **NEVER** bypass TypeScript safety without documented justification

---

## 🚨 **IMMEDIATE ACTIONS REQUIRED**

When starting any development work:

1. **Verify strict TypeScript is enabled** in `tsconfig.json`
2. **Check ESLint configuration** has strict rules enabled
3. **Run linting immediately** to identify existing issues
4. **Fix all errors** before implementing new features
5. **Test build process** to ensure no TypeScript violations

---

## 📚 **ENFORCEMENT EVIDENCE**

This rule was created because previous development encountered:
- Runtime errors from undefined property access
- Build failures due to uninitialized class properties  
- Type safety violations that could have been caught at compile-time
- ESLint configuration issues that allowed unsafe patterns

---

## 🎖️ **RULE STATUS**: **ACTIVE AND MANDATORY**

This rule must be followed in ALL future Warp conversations involving this codebase or any TypeScript development. Non-compliance should result in immediate correction and re-enforcement of these standards.

**Implementation Date**: 2025-07-06  
**Last Updated**: 2025-07-06  
**Rule Author**: Agent Mode Assistant  
**Approval**: User-Mandated Requirement
