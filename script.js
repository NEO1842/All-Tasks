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

// 🗓 Start Date（ラベル方式に完全統一）
function getStartDate(issue) {
  const label = issue.labels.find(l =>
    l.name.toLowerCase().startsWith("start:")
  );

  return label
    ? label.name.replace("start:", "").trim()
    : null;
}

// ラベル取得
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

  // 🎯 Start Dateが今日だけ
  const todayIssues = issues.filter(issue => {
    if (issue.pull_request) return false;

    const startDate = getStartDate(issue);
    return startDate === today;
  });

  let body = "";

  body += "📅 Start Date Task Report\n";
  body += "====================================\n\n";

  if (todayIssues.length === 0) {
    body += "📭 今日開始のタスクはありません\n";
  }

  for (const issue of todayIssues) {
    const status = getLabel(issue, "status:", "No Status");
    const progress = getLabel(issue, "progress:", "0%");
    const priority = getLabel(issue, "priority:", "Normal");

    const assignees =
      issue.assignees?.map(a => a.login).join(", ") || "未設定";

    body += `📌 ${issue.title}\n\n`;
    body += `👤 担当者 : ${assignees}\n`;
    body += `🚦 進行状況 : ${status}\n`;
    body += `📊 進捗 : ${progress}\n`;
    body += `🔥 優先順位 : ${priority}\n\n`;
    body += `🔗 ${issue.html_url}\n\n`;
    body += "━━━━━━━━━━━━━━━━━━━━\n\n";
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
    subject: `📅 Start Date Tasks (${today})`,
    text: body
  });

  console.log("Mail sent successfully!");
}

main().catch(console.error);
