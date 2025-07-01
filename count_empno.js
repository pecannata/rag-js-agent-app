// Extract and count unique employee numbers from the console log data
const employees = [
  7839, // KING
  7698, // BLAKE
  7782, // CLARK
  7566, // JONES
  7788, // SCOTT
  7902, // FORD
  7369, // SMITH
  7499, // ALLEN
  7521, // WARD
  7654, // MARTIN
  7844, // TURNER
  7876, // ADAMS
  7900, // JAMES
  7934  // MILLER
];

const uniqueEmployees = [...new Set(employees)];
console.log(`Total number of unique employee numbers (empno): ${uniqueEmployees.length}`);
console.log('Employee numbers:', uniqueEmployees.sort((a, b) => a - b));
