/**
 * @param {number} numCourses
 * @param {number[][]} prerequisites
 * @return {number[]}
 */
function findOrder(numCourses, prerequisites) {
  // Kahn's algorithm: take any course with no unmet prerequisite, then update the rest.
  const after = Array.from({ length: numCourses }, () => []); // course -> the courses that need it
  const need = new Array(numCourses).fill(0); // course -> how many prerequisites it still waits for
  for (const [course, pre] of prerequisites) {
    after[pre].push(course);
    need[course]++;
  }
  const order = [];
  for (let c = 0; c < numCourses; c++) if (need[c] === 0) order.push(c);
  for (let h = 0; h < order.length; h++) for (const next of after[order[h]]) if (--need[next] === 0) order.push(next);
  return order.length === numCourses ? order : []; // short means a cycle
}
