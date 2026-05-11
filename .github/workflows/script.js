const nodemailer = require("nodemailer");

const owner = "NEO1842";
const repo = "All-Tasks";

async function fetchIssues() {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json"
      }
    }
  );

  return await res.json();
}

function getLabel(issue, prefix, fallback) {
  const label = issue.labels.find(l =>
    l.name.toLowerCase().startsWith(prefix.toLowerCase())
  );

  return label
    ? label.name.replace(prefix, "").trim()
    : fallback;
}

async function main() {
  const issues = await fetchIssues();

  const today = new Date().toISOString().split("T")[0];

  let body = "";

  body += "📅 GitHub Project Daily Report\n";
  body += "====================================\n\n";

  const inProgressIssues = [];
  const completedIssues = [];

  for (const issue of issues) {
    if (issue.pull_request) continue;

    const status = getLabel(issue, "status:", "No Status");
    const progress = getLabel(issue, "progress:", "0%");
    const priority = getLabel(issue, "priority:", "Normal");

    const issueData = {
      title: issue.title,
      status,
      progress,
      priority,
      url: issue.html_url
    };

    const isCompleted =
      status.toLowerCase().includes("done") ||
      status.toLowerCase().includes("complete") ||
      status.toLowerCase().includes("completed");

    if (isCompleted) {
      completedIssues.push(issueData);
    } else {
      inProgressIssues.push(issueData);
    }
  }

  if (inProgressIssues.length > 0) {
    body += "🚀 進行中 / 未完了\n";
    body += "------------------------------------\n\n";

    for (const issue of inProgressIssues) {
      body += `📌 ${issue.title}\n\n`;
      body += `🚦 Status   : ${issue.status}\n`;
      body += `📊 Progress : ${issue.progress}\n`;
      body += `🔥 Priority : ${issue.priority}\n\n`;
      body += `🔗 ${issue.url}\n\n`;
      body += "━━━━━━━━━━━━━━━━━━━━\n\n";
    }
  }

  if (completedIssues.length > 0) {
    body += "\n✅ 完了済み\n";
    body += "------------------------------------\n\n";

    for (const issue of completedIssues) {
      body += `✔ ${issue.title}\n\n`;
      body += `🚦 Status   : ${issue.status}\n`;
      body += `📊 Progress : ${issue.progress}\n`;
      body += `🔥 Priority : ${issue.priority}\n\n`;
      body += `🔗 ${issue.url}\n\n`;
      body += "━━━━━━━━━━━━━━━━━━━━\n\n";
    }
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: process.env.GMAIL_USER,
    subject: `📅 GitHub Project Daily Report (${today})`,
    text: body
  });

  console.log("Mail sent successfully!");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
