const { PermissionsBitField } = require('discord.js');
const { readAllianceList, writeAllianceList, readMemberList, writeMemberList } = require('./dataUtils');

async function assignRoleToUser(member, roleId) {
  try {
    await member.roles.add(roleId);
    console.log(`Role assigned: ${roleId}`);
  } catch (error) {
    console.error(`Error assigning role: ${error}`);
  }
}

function getRoleIdFromAlliance(serverId, allianceName) {
  const allianceList = readAllianceList();
  const serverAlliances = allianceList[serverId] || [];
  const alliance = serverAlliances.find(entry => entry.alliance_name === allianceName);
  return alliance ? alliance.role_id : null;
}

function getServerIdFromMemberList(memberId) {
  const memberList = readMemberList();
  for (const [serverId, members] of Object.entries(memberList)) {
    if (members.find(member => member.discord_id === memberId)) {
      return serverId;
    }
  }
  return null;
}

module.exports = {
  assignRoleToUser,
  getRoleIdFromAlliance,
  getServerIdFromMemberList
};
