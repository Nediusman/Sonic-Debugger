/** The demo program: it raises an IndexError inside `average`, at line 5. */
export const EXAMPLE_SOURCE = `# Average the scores of each team.
def average(scores):
    total = 0
    for i in range(len(scores) + 1):
        if scores[i] >= 0:
            total = total + scores[i]
    return total / len(scores)


def report(name, scores):
    print(name, "average:", average(scores))


teams = {"owls": [4, 8, 6], "bats": [7, 5, 9]}
for name in teams:
    report(name, teams[name])
`;
