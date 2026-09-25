class Solution:
    def findOrder(self, numCourses: int, prerequisites: List[List[int]]) -> List[int]:
        # Kahn's algorithm: take any course with no unmet prerequisite, then update the rest.
        after = [[] for _ in range(numCourses)]  # course -> the courses that need it
        need = [0] * numCourses  # course -> how many prerequisites it still waits for
        for course, pre in prerequisites:
            after[pre].append(course)
            need[course] += 1
        order = [c for c in range(numCourses) if need[c] == 0]
        for c in order:  # the list grows as courses become ready
            for nxt in after[c]:
                need[nxt] -= 1
                if need[nxt] == 0:
                    order.append(nxt)
        return order if len(order) == numCourses else []  # short means a cycle
