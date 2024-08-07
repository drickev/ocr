const fs = require('fs');
const path = require('path');

function readAllianceList() {
  const filePath = path.join(__dirname, '../json/alliance_list.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeAllianceList(data) {
  const filePath = path.join(__dirname, '../json/alliance_list.json');
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function readMemberList() {
  const filePath = path.join(__dirname, '../json/member_list.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeMemberList(data) {
  const filePath = path.join(__dirname, '../json/member_list.json');
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function readChannelList() {
  const filePath = path.join(__dirname, '../json/channel_list.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

module.exports = {
  readAllianceList,
  writeAllianceList,
  readMemberList,
  writeMemberList,
  readChannelList
};
