// Verification test script for GitPing Label Matcher
const { matchIssueLabels, normalizeLabel } = require('../src/lib/matcher');

console.log('🧪 Starting GitPing Label Matcher Verification Suite...\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

// User Prompt Scenario
const trackedLabels = ['good first issue', 'help wanted', 'documentation'];

// Scenario 1: Issue with documentation + good first issue
const issueA = [
  { name: 'documentation', color: '0075ca' },
  { name: 'good first issue', color: '7057ff' },
];
const resultA = matchIssueLabels(issueA, trackedLabels, 'any');
assert(resultA.isMatch === true, 'Scenario A (documentation + good first issue) must MATCH');
assert(resultA.matchedLabels.length === 2, 'Scenario A must match 2 labels');

// Scenario 2: Issue with bug + enhancement
const issueB = [
  { name: 'bug', color: 'd73a4a' },
  { name: 'enhancement', color: 'a2eeef' },
];
const resultB = matchIssueLabels(issueB, trackedLabels, 'any');
assert(resultB.isMatch === false, 'Scenario B (bug + enhancement) must NOT MATCH');
assert(resultB.matchedLabels.length === 0, 'Scenario B must match 0 labels');

// Scenario 3: Issue with single matching label (help wanted)
const issueC = [
  { name: 'help wanted', color: '008672' },
  { name: 'python', color: 'cccccc' },
];
const resultC = matchIssueLabels(issueC, trackedLabels, 'any');
assert(resultC.isMatch === true, 'Scenario C (help wanted) must MATCH');

// Scenario 4: Case insensitive matching (e.g. 'Documentation' vs 'documentation')
const issueD = [
  { name: 'Documentation', color: '0075ca' },
];
const resultD = matchIssueLabels(issueD, trackedLabels, 'any');
assert(resultD.isMatch === true, 'Scenario D (Case insensitivity: Documentation vs documentation) must MATCH');

// Scenario 5: Mode 'all' (AND logic)
const resultEAll = matchIssueLabels(issueA, trackedLabels, 'all');
assert(resultEAll.isMatch === false, 'Mode ALL: issue with only 2 of 3 tracked labels must NOT MATCH in ALL mode');

const issueAllThree = [
  { name: 'documentation', color: '0075ca' },
  { name: 'good first issue', color: '7057ff' },
  { name: 'help wanted', color: '008672' },
];
const resultAllThree = matchIssueLabels(issueAllThree, trackedLabels, 'all');
assert(resultAllThree.isMatch === true, 'Mode ALL: issue with all 3 tracked labels must MATCH in ALL mode');

console.log(`\n🎉 Test Results: ${passedTests}/${totalTests} tests passed successfully!`);
