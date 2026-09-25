class Solution:
    def canFinish(self, numCourses: int, prerequisites: List[List[int]]) -> bool:
        # Kahn's algorithm: take any course with no unmet prerequisite, then update the rest.
        after = [[] for _ in range(numCourses)]  # course -> the courses that need it
        need = [0] * numCourses  # course -> how many prerequisites it still waits for
        for course, pre in prerequisites:
            after[pre].append(course)
            need[course] += 1
        ready = deque(c for c in range(numCourses) if need[c] == 0)
        taken = 0
        while ready:
            c = ready.popleft()
            taken += 1
            for nxt in after[c]:
                need[nxt] -= 1
                if need[nxt] == 0:
                    ready.append(nxt)
        return taken == numCourses  # any course never taken is on a cycle
