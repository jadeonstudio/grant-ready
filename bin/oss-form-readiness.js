#!/usr/bin/env node

const HELP = `oss-form-readiness

Generate a quick OSS support-program readiness report from public GitHub signals.

Usage:
  oss-form-readiness owner/repo
  oss-form-readiness https://github.com/owner/repo

Options:
  --json        Print JSON instead of a text report
  --markdown    Print Markdown for APPLICATION.md or grant notes
  --no-network  Use demo data, useful for screenshots and tests
  -h, --help    Show this help
`;

const args = process.argv.slice(2);
const wantsHelp = args.includes("-h") || args.includes("--help");
const asJson = args.includes("--json");
const asMarkdown = args.includes("--markdown");
const noNetwork = args.includes("--no-network");
const target = args.find((arg) => !arg.startsWith("-"));

if (wantsHelp || !target) {
  console.log(HELP.trim());
  process.exit(wantsHelp ? 0 : 1);
}

const repoId = parseRepo(target);

if (!repoId) {
  fail("Expected a GitHub repo as owner/repo or https://github.com/owner/repo");
}

try {
  const data = noNetwork ? demoData(repoId) : await fetchRepoData(repoId);
  const report = buildReport(data);
  console.log(formatOutput(report, { asJson, asMarkdown }));
} catch (error) {
  fail(error.message);
}

function formatOutput(report, { asJson, asMarkdown }) {
  if (asJson) return JSON.stringify(report, null, 2);
  if (asMarkdown) return formatMarkdown(report);
  return formatReport(report);
}

function parseRepo(input) {
  const trimmed = input.trim().replace(/\/$/, "");
  const urlMatch = trimmed.match(/^https?:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+)(?:.*)?$/i);
  const pairMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  const match = urlMatch || pairMatch;

  if (!match) return null;

  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, "")
  };
}

async function fetchRepoData({ owner, repo }) {
  const headers = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "oss-form-readiness"
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const base = `https://api.github.com/repos/${owner}/${repo}`;
  const [repoInfo, commits, releases, contributors] = await Promise.all([
    getJson(base, headers),
    getJson(`${base}/commits?per_page=30`, headers),
    getJson(`${base}/releases?per_page=5`, headers),
    getJson(`${base}/contributors?per_page=10`, headers)
  ]);

  return {
    owner,
    repo,
    fullName: repoInfo.full_name,
    description: repoInfo.description || "",
    stars: repoInfo.stargazers_count || 0,
    forks: repoInfo.forks_count || 0,
    openIssues: repoInfo.open_issues_count || 0,
    defaultBranch: repoInfo.default_branch || "main",
    language: repoInfo.language || "Unknown",
    pushedAt: repoInfo.pushed_at,
    createdAt: repoInfo.created_at,
    homepage: repoInfo.homepage || "",
    topics: repoInfo.topics || [],
    commits: Array.isArray(commits) ? commits : [],
    releases: Array.isArray(releases) ? releases : [],
    contributors: Array.isArray(contributors) ? contributors : [],
    htmlUrl: repoInfo.html_url
  };
}

async function getJson(url, headers) {
  const response = await fetch(url, { headers });

  if (!response.ok) {
    const hint = response.status === 403
      ? "GitHub rate limit may be exhausted. Set GITHUB_TOKEN or retry later."
      : `GitHub returned HTTP ${response.status}.`;
    throw new Error(`${hint} ${url}`);
  }

  return response.json();
}

function buildReport(data) {
  const now = Date.now();
  const pushedDaysAgo = daysBetween(data.pushedAt, now);
  const recentCommits = data.commits.filter((commit) => {
    const date = commit.commit?.committer?.date || commit.commit?.author?.date;
    return daysBetween(date, now) <= 30;
  });
  const latestRelease = data.releases[0];
  const releaseDaysAgo = latestRelease ? daysBetween(latestRelease.published_at || latestRelease.created_at, now) : null;

  const checks = [
    check("Public repository URL is available", Boolean(data.htmlUrl)),
    check("Recent maintenance activity within 30 days", pushedDaysAgo <= 30),
    check("At least 3 recent commits are visible", recentCommits.length >= 3),
    check("Has multiple contributors", data.contributors.length >= 2),
    check("Has public releases", data.releases.length > 0),
    check("Has visible ecosystem signals", data.stars >= 50 || data.forks >= 10 || data.contributors.length >= 5),
    check("Description explains the project", data.description.length >= 20)
  ];

  const score = Math.round((checks.filter((item) => item.passed).length / checks.length) * 100);

  return {
    repo: data.fullName,
    url: data.htmlUrl,
    summary: {
      description: data.description || "(no description)",
      language: data.language,
      stars: data.stars,
      forks: data.forks,
      openIssues: data.openIssues,
      contributorsSample: data.contributors.length,
      recentCommits30d: recentCommits.length,
      lastPushedDaysAgo: pushedDaysAgo,
      latestRelease: latestRelease?.name || latestRelease?.tag_name || null,
      latestReleaseDaysAgo: releaseDaysAgo,
      topics: data.topics
    },
    score,
    checks,
    drafts: {
      fit: draftFit(data, recentCommits.length),
      apiCredits: draftApiCredits(data),
      extra: draftExtra(data)
    },
    nextSteps: nextSteps(checks)
  };
}

function check(label, passed) {
  return { label, passed };
}

function daysBetween(dateString, now) {
  if (!dateString) return Infinity;
  return Math.floor((now - new Date(dateString).getTime()) / 86400000);
}

function draftFit(data, recentCommits) {
  const impact = [
    `${data.fullName} is an open-source ${data.language || "software"} project`,
    data.description ? `focused on ${lowerFirst(data.description)}.` : "with a public maintainer workflow.",
    `It currently has ${data.stars} stars, ${data.forks} forks, and visible activity across ${recentCommits} recent commits.`
  ].join(" ");

  return `${impact} I maintain the repository by reviewing issues, improving documentation, shipping releases, and keeping the project useful for developers who depend on it.`;
}

function draftApiCredits(data) {
  return `I plan to use API credits for maintainer workflows in ${data.fullName}: triaging issues, drafting pull request reviews, summarizing release changes, improving documentation, and checking code quality for contributions before releases.`;
}

function draftExtra(data) {
  return `The project is public at ${data.htmlUrl}. I can provide additional context about maintenance work, roadmap, adoption, and contributor activity if helpful.`;
}

function nextSteps(checks) {
  const failed = checks.filter((item) => !item.passed).map((item) => item.label);

  if (failed.length === 0) {
    return ["Add this report to your application notes.", "Keep recent releases and maintainer activity visible."];
  }

  return failed.map((label) => {
    if (label.includes("Recent maintenance")) return "Push a small maintenance commit or documentation update before applying.";
    if (label.includes("recent commits")) return "Make recent work visible with small fixes, docs, examples, or release prep commits.";
    if (label.includes("contributors")) return "Document contribution paths and invite one or two collaborators to review or contribute.";
    if (label.includes("releases")) return "Create a first GitHub release so reviewers can see project maturity.";
    if (label.includes("ecosystem")) return "Add README sections showing who uses the project, why it matters, or what problem it solves.";
    if (label.includes("Description")) return "Update the GitHub repo description with a clear one-sentence value proposition.";
    return `Address: ${label}`;
  });
}

function formatReport(report) {
  const lines = [];

  lines.push(`OSS Form Readiness: ${report.repo}`);
  lines.push("=".repeat(`OSS Form Readiness: ${report.repo}`.length));
  lines.push("");
  lines.push(`Score: ${report.score}/100`);
  lines.push("");
  lines.push("Repo summary");
  lines.push(`- URL: ${report.url}`);
  lines.push(`- Description: ${report.summary.description}`);
  lines.push(`- Language: ${report.summary.language}`);
  lines.push(`- Stars: ${report.summary.stars}`);
  lines.push(`- Forks: ${report.summary.forks}`);
  lines.push(`- Open issues: ${report.summary.openIssues}`);
  lines.push(`- Recent commits (30d): ${report.summary.recentCommits30d}`);
  lines.push(`- Last pushed: ${formatDays(report.summary.lastPushedDaysAgo)}`);
  lines.push(`- Latest release: ${report.summary.latestRelease || "none"}`);
  lines.push("");
  lines.push("Checklist");
  report.checks.forEach((item) => {
    lines.push(`${item.passed ? "[x]" : "[ ]"} ${item.label}`);
  });
  lines.push("");
  lines.push("Application draft: why this repo fits");
  lines.push(wrap(report.drafts.fit));
  lines.push("");
  lines.push("Application draft: API credit plan");
  lines.push(wrap(report.drafts.apiCredits));
  lines.push("");
  lines.push("Application draft: extra context");
  lines.push(wrap(report.drafts.extra));
  lines.push("");
  lines.push("Next steps");
  report.nextSteps.forEach((step) => lines.push(`- ${step}`));

  return lines.join("\n");
}

function formatMarkdown(report) {
  const lines = [];

  lines.push(`# OSS support application notes: ${report.repo}`);
  lines.push("");
  lines.push(`Repository: ${report.url}`);
  lines.push(`Readiness score: ${report.score}/100`);
  lines.push("");
  lines.push("## Repository signals");
  lines.push("");
  lines.push(`- Description: ${report.summary.description}`);
  lines.push(`- Language: ${report.summary.language}`);
  lines.push(`- Stars: ${report.summary.stars}`);
  lines.push(`- Forks: ${report.summary.forks}`);
  lines.push(`- Open issues: ${report.summary.openIssues}`);
  lines.push(`- Recent commits in the last 30 days: ${report.summary.recentCommits30d}`);
  lines.push(`- Last pushed: ${formatDays(report.summary.lastPushedDaysAgo)}`);
  lines.push(`- Latest release: ${report.summary.latestRelease || "none"}`);
  if (report.summary.topics.length > 0) {
    lines.push(`- Topics: ${report.summary.topics.join(", ")}`);
  }
  lines.push("");
  lines.push("## Checklist");
  lines.push("");
  report.checks.forEach((item) => {
    lines.push(`- ${item.passed ? "[x]" : "[ ]"} ${item.label}`);
  });
  lines.push("");
  lines.push("## Why this repository fits");
  lines.push("");
  lines.push(report.drafts.fit);
  lines.push("");
  lines.push("## API credit plan");
  lines.push("");
  lines.push(report.drafts.apiCredits);
  lines.push("");
  lines.push("## Extra context");
  lines.push("");
  lines.push(report.drafts.extra);
  lines.push("");
  lines.push("## Before applying");
  lines.push("");
  report.nextSteps.forEach((step) => lines.push(`- ${step}`));

  return lines.join("\n");
}

function formatDays(days) {
  if (!Number.isFinite(days)) return "unknown";
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function wrap(text, width = 88) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }

  if (line) lines.push(line);
  return lines.join("\n");
}

function demoData({ owner, repo }) {
  return {
    owner,
    repo,
    fullName: `${owner}/${repo}`,
    description: "A practical open-source tool for maintainers preparing support-program applications.",
    stars: 128,
    forks: 18,
    openIssues: 7,
    defaultBranch: "main",
    language: "JavaScript",
    pushedAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
    homepage: "",
    topics: ["oss", "maintainers", "github", "grants"],
    commits: Array.from({ length: 8 }, (_, index) => ({
      commit: {
        committer: {
          date: new Date(Date.now() - index * 86400000).toISOString()
        }
      }
    })),
    releases: [{
      name: "v0.1.0",
      tag_name: "v0.1.0",
      published_at: new Date(Date.now() - 2 * 86400000).toISOString()
    }],
    contributors: Array.from({ length: 4 }, (_, index) => ({ login: `contributor-${index + 1}` })),
    htmlUrl: `https://github.com/${owner}/${repo}`
  };
}

function lowerFirst(text) {
  if (!text) return text;
  return text.charAt(0).toLowerCase() + text.slice(1).replace(/[.?!]\s*$/, "");
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}
