/**
 * @param {number} numCourses
 * @param {number[][]} prerequisites
 * @return {boolean}
 */
function canFinish(numCourses, prerequisites) {
  // Kahn's algorithm: take any course with no unmet prerequisite, then update the rest.
  const after = Array.from({ length: numCourses }, () => []); // course -> the courses that need it
  const need = new Array(numCourses).fill(0); // course -> how many prerequisites it still waits for
  for (const [course, pre] of prerequisites) {
    after[pre].push(course);
    need[course]++;
  }
  const ready = [];
  for (let c = 0; c < numCourses; c++) if (need[c] === 0) ready.push(c);
  let taken = 0;
  for (let h = 0; h < ready.length; h++) {
    taken++;
    for (const next of after[ready[h]]) if (--need[next] === 0) ready.push(next);
  }
  return taken === numCourses; // any course never taken is on a cycle
}
