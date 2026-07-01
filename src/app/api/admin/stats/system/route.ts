import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import os from 'os';
import { execSync } from 'child_process';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    // CPU
    const cpus = os.cpus();
    const cpuCount = cpus.length;
    const cpuModel = cpus[0]?.model || 'Unknown';
    const cpuTimes = cpus.reduce(
      (acc, cpu) => {
        acc.user += cpu.times.user;
        acc.nice += cpu.times.nice;
        acc.sys += cpu.times.sys;
        acc.idle += cpu.times.idle;
        acc.irq += cpu.times.irq;
        return acc;
      },
      { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 }
    );
    const cpuTotal = cpuTimes.user + cpuTimes.nice + cpuTimes.sys + cpuTimes.idle + cpuTimes.irq;
    const cpuIdle = cpuTimes.idle;
    const cpuUsage = cpuTotal > 0 ? ((cpuTotal - cpuIdle) / cpuTotal * 100) : 0;

    // Memory
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsage = (usedMem / totalMem) * 100;

    // Disk
    let diskTotal = 0;
    let diskUsed = 0;
    let diskFree = 0;
    let diskUsage = 0;

    try {
      if (process.platform === 'win32') {
        const output = execSync('wmic logicaldisk where "DeviceID=\'C:\'" get Size,FreeSpace /format:csv', {
          encoding: 'utf8',
          timeout: 5000,
        });
        const lines = output.trim().split('\n').filter(l => l.includes(','));
        if (lines.length > 0) {
          const parts = lines[lines.length - 1].split(',');
          diskFree = parseInt(parts[1]) || 0;
          diskTotal = parseInt(parts[2]) || 0;
          diskUsed = diskTotal - diskFree;
          diskUsage = diskTotal > 0 ? (diskUsed / diskTotal) * 100 : 0;
        }
      } else {
        const output = execSync("df -B1 / | tail -1 | awk '{print $2,$3,$4,$5}'", {
          encoding: 'utf8',
          timeout: 5000,
        });
        const parts = output.trim().split(/\s+/);
        diskTotal = parseInt(parts[0]) || 0;
        diskUsed = parseInt(parts[1]) || 0;
        diskFree = parseInt(parts[2]) || 0;
        diskUsage = parseFloat(parts[3]) || 0;
      }
    } catch {
      // 磁盘信息获取失败时返回 0
    }

    // Uptime
    const uptime = os.uptime();

    return NextResponse.json({
      cpu: {
        model: cpuModel,
        cores: cpuCount,
        usage: Math.round(cpuUsage * 100) / 100,
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usage: Math.round(memUsage * 100) / 100,
      },
      disk: {
        total: diskTotal,
        used: diskUsed,
        free: diskFree,
        usage: Math.round(diskUsage * 100) / 100,
      },
      uptime,
    });
  } catch (error) {
    console.error('Get system stats error:', error);
    return NextResponse.json({ error: '获取系统状态失败' }, { status: 500 });
  }
}
