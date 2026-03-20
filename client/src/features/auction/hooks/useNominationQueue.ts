import { useState, useEffect } from 'react';

export function useNominationQueue(teamId: number | undefined) {
    const [queue, setQueue] = useState<string[]>([]); // List of MLB IDs (strings)

    useEffect(() => {
        if (!teamId) {
            setQueue([]);
            return;
        }

        const key = `nominationQueue_${teamId}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                setQueue(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse queue", e);
                setQueue([]);
            }
        } else {
            setQueue([]);
        }
    }, [teamId]);

    const save = (newQueue: string[]) => {
        if (!teamId) return;
        setQueue(newQueue);
        localStorage.setItem(`nominationQueue_${teamId}`, JSON.stringify(newQueue));
    };

    const add = (playerId: string | number) => {
        if (!teamId) return;
        const sid = String(playerId);
        if (queue.includes(sid)) return;
        save([...queue, sid]);
    };

    const remove = (playerId: string | number) => {
        if (!teamId) return;
        const sid = String(playerId);
        save(queue.filter(id => id !== sid));
    };

    const isQueued = (playerId: string | number) => {
        return queue.includes(String(playerId));
    };

    const toggle = (playerId: string | number) => {
        if (isQueued(playerId)) remove(playerId);
        else add(playerId);
    };

    const moveUp = (playerId: string | number) => {
        const sid = String(playerId);
        const idx = queue.indexOf(sid);
        if (idx <= 0) return;
        const next = [...queue];
        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
        save(next);
    };

    const moveDown = (playerId: string | number) => {
        const sid = String(playerId);
        const idx = queue.indexOf(sid);
        if (idx < 0 || idx >= queue.length - 1) return;
        const next = [...queue];
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
        save(next);
    };

    return { queue, add, remove, isQueued, toggle, moveUp, moveDown };
}
