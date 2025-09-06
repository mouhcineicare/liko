'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function LogsPage() {
  const [regularLogs, setRegularLogs] = useState('');
  const [errorLogs, setErrorLogs] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = () => {
    setLoading(true);
    fetch('/api/admin/logs')
      .then(res => res.json())
      .then(data => {
        setRegularLogs(data.regularLogs || data.error);
        setErrorLogs(data.errorLogs || data.error);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold">Server Logs</h1>
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1 rounded text-sm"
          onClick={fetchLogs}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      <Tabs defaultValue="regular" className="w-full">
        <TabsList>
          <TabsTrigger value="regular">Regular Logs</TabsTrigger>
          <TabsTrigger value="errors">Error Logs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="regular">
          <ScrollArea className="h-[600px] bg-black text-green-400 p-2 rounded overflow-auto">
            {loading ? 'Loading logs...' : <pre>{regularLogs}</pre>}
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="errors">
          <ScrollArea className="h-[600px] bg-black text-red-400 p-2 rounded overflow-auto">
            {loading ? 'Loading logs...' : <pre>{errorLogs}</pre>}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </Card>
  );
}