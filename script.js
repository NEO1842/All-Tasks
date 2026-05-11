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

  // 🎯 今日作成されたIssueだけ
  const todayIssues = issues.filter(
    issue =>
      !issue.pull_request &&
      issue.created_at.startsWith(today)
  );

  let body = "";

  body += "📅 Daily Issue Report\n";
  body += "====================================\n\n";

  const openIssues = [];
  const closedIssues = [];

  for (const issue of todayIssues) {
    const status = getLabel(issue, "status:", "No Status");
    const progress = getLabel(issue, "progress:", "0%");
    const priority = getLabel(issue, "priority:", "Normal");

    const data = {
      title: issue.title,
      status,
      progress,
      priority,
      url: issue.html_url,
      state: issue.state
    };

    if (issue.state === "closed") {
      closedIssues.push(data);
    } else {
      openIssues.push(data);
    }
  }

  // 🚀 未完了
  if (openIssues.length > 0) {
    body += "🚀 進行中 / 未完了\n";
    body += "------------------------------------\n\n";

    for (const issue of openIssues) {
      body += `📌 ${issue.title}\n\n`;
      body += `🚦 Status   : ${issue.status}\n`;
      body += `📊 Progress : ${issue.progress}\n`;
      body += `🔥 Priority : ${issue.priority}\n\n`;
      body += `🔗 ${issue.url}\n\n`;
      body += "━━━━━━━━━━━━━━━━━━━━\n\n";
    }
  }

  // ✅ 完了
  if (closedIssues.length > 0) {
    body += "\n✅ 完了済み\n";
    body += "------------------------------------\n\n";

    for (const issue of closedIssues) {
      body += `✔ ${issue.title}\n\n`;
      body += `🚦 Status   : ${issue.status}\n`;
      body += `📊 Progress : ${issue.progress}\n`;
      body += `🔥 Priority : ${issue.priority}\n\n`;
      body += `🔗 ${issue.url}\n\n`;
      body += "━━━━━━━━━━━━━━━━━━━━\n\n";
    }
  }

  if (todayIssues.length === 0) {
    body += "📭 Today has no issues.\n";
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
    subject: `📅 Daily Report (${today})`,
    text: body
  });

  console.log("Mail sent successfully!");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
