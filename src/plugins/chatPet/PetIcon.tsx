/*
 * Discord+, a fork of Vencord
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { React, useEffect, useRef } from "@webpack/common";

const PET_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAASIklEQVR4nO1beZCc1XH/9XvfMcfu7KELHUagCxAgMIqNAMVeTCpAOG0jcRgomWMVOwV2Uq5UhX9WKqcKl6soygkxaEUKYRuBdzEgCUxs7HgFCacSUNBhCa1wAIGkRau9Zuf4vvdeqt83s9rZnd2dWSRMqtxVI83O971+3f26+3X360dmc/M2CFoKZQwIhOFgYOAIQNBuDIR30or1L5vffdmhi7eG+AyCaVshaWW7Mm23nYYa7xEYLEOoAKJSvpgzQQSl3xFw5VJog1HMM/BvFgEWo9b9tXnqjpXMPE+EzxgY0yIs88/c9iWkYi/CEReMwTwDWZ5duVAgCPW4mBlBLtRQOom4+4TZdMeySMqTFwKLm/Wt5MNETRZfS4sA1hjz7LfmwfW2gDAdmUCNwfwxCJRxABITzkAkECqFuCsB2mC2NZ+NpetCE81gxiWODat9hcC0xRExHdC0dq0ux65lpKlDAE1A1y6DFe2aaHz8FtbYdTLmmTvXozaWQn82hCCnAr6IzObmiScogjYhUjEH/Zlv0jUPbzC/a3Ho4rWj/IFdzbYVVrCsLeVQmWduq8UU30EvgEGl6frW3nKsDmnaGMIYsvtNd3wFcf+3yAY8X8Xa6aAaiByHAcQqABvQBF2Occt0gXHzy7t8IFwCrb8A4BxoswiEk2DQgKPKYxWBT6HZ1NwNoi7A7AOwHdLZhjjeoot/PFAijJGCKGoW0+QIA8M6V7k1UVUaEO0KhFB/DNefT3/1z312OoIprsSQKi87/BVeNyhzCQTmI+ZGOJQGlAG0PmY8TK8QgCRAiujvnAJC9QGItkKIdhxM/4q++Wi2ZNVZidnK2My2NL8NzzkT+UBXZNaTEgAsySx/A8c9na74l72mpYW1yNq1aVvhoWbKzQDughTngl1GLgTyTKuJTCFyG4yDjvk9qzvWN1p2IpBwJcF32PRYGHthzEM4MvCvdMtjfXaUWSGJ2pV5+jv1EJlOOKIRoR69nR93ATDkcQb00XeGVn1z801wxD3w3TPt9pPllQA7O1HNipSAFQaxqhA8R1hh5MJ3odV9uKL1x3b12SwSU1NQYScc2XBiBWBgIAVBqx4E8jT6+kOHzZOrFiIZ/xE8eTmY55x1QmR3juMKRsNAw3McK4hs+Ary6m66tnWb1Ty/fgd8ZyHyvK1XPreoigaChm8d7F7L/Obm65GMv2qZH8gp5AINInn8mbeTCxA5Nm7hbc4VF8AX/2Gebb6LVrbnQfSmFQwLqRqspioNMAqpuER/9jYY1CHl34/BgO2Tg45PNzo0UBCQqIsDfZkfQpsOxL3nrOmZyrdBUcWMGr4j0Z/ZBa3/DKnY/XbVQ8X7wKcfGhMkmNWjmRCp+N/D0I1I51+2NAJlY49yICxjE4ExGiQ4GuR3JTzn2+jPamiwWk46hP3EwM6O4KAnoxBzboGgaciFeQiSluYJwWhhvWskMWWdXOTp+Rv/r2BMiLgnrPqHpg+OPA2B5qeiGm97gkHafMURi6BMFtpkkPQjmsfmS8FxhEA+3IOkJ5HwpA1yom2O7PeYK1Efd5AP/wdGP4qY60HpKI7/rLB+DARCrRFz4zB6E7LBS6iLS5u/jOSLf6uNSQThAQdO7Bxk8jdC0s0w5iwOLiN/r7uhaTcyug2kfgXXfQHGJCLV+iOq/XjAEUCoHPjuZUiHfwnkT4ekVTDmzBK+FO1CTrdD539awoh59a4UjmROgnAIFO+iy+7vtr9vuvPfUBe/FL2ZT9/bT2Z3YI3O5HfSVa28oDAvNNchr2eM5IuBhtLVnYuNTVNHgNm0+kbUehvt3sv78P8H4KyVTbc3cw9ds/7ekY+NMYSOJommrapUA1gYa1oIZ+4q/i6jCMtdgFzA292422Yxij9RBlIFfnaInHD1wlELcOmcHrTvIl5krFlrhmeTYvgofmC1YNpisjF+vOFG1MYWFiK8ssxrY6A41+HxrGFORB1nzZqTmE8Ik8QvECiNZKwBOXE3UYGntWtH1RRo5MgoL+N31hA2f/g2Yu4ZNr4uE10xAYLTXFcAmQB9A3mbv9TVeEDCs6mvHgxsqDAZrfiE+LXNW0J9ZGTqPvwlZ9QwLmgQKfNMcxMS7mJkCvH9qCSNIGo87NjbhbYX9+P1PV04eDRjn02ri+HzC6biuotOxflLZtqU2ChGU5kUjhP+qIxXG5uK/szXbAGno0UCpRUsZ9TsxQoL4SY40sCmeMdMxSpHoXjx/UfewIPP7UY6F8J3o/SdgQnd9s7H2PDCXtzUtAD33v5FJFwJE05cpzyu+Pk72xDRTeUqWAylTrBYYYnSy73wnLlR1Tiy/2I4xQ5m9f0vYmNHJ6bVxyCFsOoaBVlRhMo8MDOHezK45JxZePyeS2xcRTZ1GD5ryfzHG3+x/p9GKOfZDHaEGYgSCgqFTCQblsCVc5EPWSbHVp9tMuHh3sf+G491dGLWlISlmFMEFjQTxB/+zjkSO6qZjQn8dvtH+N66VyA8OcREWQEcf/zMvELST8IJlttf2ttKeBZl1V+ZLyJua3hDWRVPyg5p957DeOC53ZheHyv4xvGB35nREMPGF/ej4/X3LYO2rjoCTiB+LuIwq8siHneOcBRlgc4dObO1TU/g5y/tx2AutA62UuCxrIk/29oZYR/jnROCnxVe2ROiJfbvEX5AlGAqPjRYZKu3wzyKYIIyAV7d0wXfZZusmD67umyfb3UeQaYnA+Fwolb6zonDbwhsyTDzbTWZ1kYHgSMFYCy7Q6HwDFu65sEFCZMU6O/PWw/sSjGuLY8EHu86Akf6czjYk7VObvj4E4qf4z5bxqBGuLNqi8yOEgDMsBMbQoMtRfPgY7NobYxhaU8WeA8fb3zk6CaPn8czjSXFEObA8mJSEKrB/sbh/pg+IEYuYPwhHTIFMbgk6upiNKMuFlXBqigI8Hj25PU1PmakYvZgZPh4i19ppGp8G+RMFn9jrY+ZDXGCKwT7hCE1iJyEA8r7I8eKUdhC79iGyyMdS54JP6a30DNtw4xY7e8h7OOKrZSJyeYVzppbj5rGOLQNWErfYc9NCRfnLZhqK+u8z1csABBrppkWT7yfGDzpEXWQXgMogGvPrApCsGcZo2nDqF8cxWUF+12SgEIaH9Vu1PtTz6Hbf++6xae/yYFJNTbKAgiUwfXL59kob0wtVxrXLz+VK1VjvzP2oQFdedqC7RisfU+9W/MbvFf7EwR0hLWhiB0JPxhFG4pQWBFOGrjWavdOQyE+Sm5Cd2y/l0Qyn+5NXbvs83+48ORZuwfzoZCCJqy+csmxqy+Ly5fOxhUXnQKdzpfd4ux5y2CApWfPxK1N822EF5UrxwdJpAaDQCyePuWDu5uW7dLpoymmFQPeIbyXfAohMjY1NqYPYvCoHbRm7ehIkKyPirw+iA4h4QD9znZ0xzvhh7XQpBwhNNIZ94kbr35+0dSGDwdygRREmj/D+wRYvZkh9uaHe7M46+R6PPA3ywtFubGXlnddnQvxj7efb8Pbj44OwpFkcZWE+NY9k+F500EgZ9Qkex5deeVmfqYNGaYVnkpgIHYQPe6riHPKQ93w59gzxeHuRZRQ0LEmyvqM2Wfp7PN3gYxbPG0RRCbUSji+p1644/q2ZXNn7ckEociEoVAF4fEwTh9603l09WZw6Xmz8VTLpZjWGIfJj58M8SNS2iY2G++5BDdfvBDd/Tn0pPNRVFiQHc+VC0OKVn7q/z676rqNJ580rT/M5hyHuNnEEqIhlI9efy8Cu/O/x70MtpVm2GI5Y1CyA1k+4PSPQmg+gBiSGk8Q5kIZj8eCzd/6xtMbtr6x6Mkde87a390zazAfJDiLbayL4cy5jbhu+an46kWn2HGamzYqiO5sphIqJF2Jh/72SxbH41s7bZDDwmBnl3TdzOcaUoeuOn3+TlZ7HhemB11HcvZaANYECYms24tMGhDGvocOu+i6vAC6dhXSLf0GcmFU+y8DjiQTBiGXleWqpmV7+NN9+OOao1MP30I+1U9N+ibF2xEHNGl2vaYi5kuEoAyMCvAX559sP+mejOnqy5LKm6D2SONj0xtmdFkv35f2QmOohPmRoI2GxGtlecFwWNleCIXFfwG6C3E1HXmnE9JwmlU6sKBq+b7eGJRUjY2+2zi3vgZcsgoUdCawQyKHV305yJoDJ3PpvB2djLuUrPENJHmQ8Vh4ZFCGIvBj0lVDaj8c2CQ1hUioBgiTgeN02N87Sgu/omRS6wjbJF3dOgiB/0Rt9lyEIhud8ZcHz5HkGZnVycx8I42jMnltlCFe8WoSmrGAcTAu1giVC43mJCGRWeRA5mPuOEVqyRUhmUFt5mwIvZsue/B9a/9rx0uGGNrtv0CIDZiCRUhl5yAvByGMBBV2CQb73UgEMot4WCca88soNEYSV9Rw3KGws5DgY7m68FzU5maNS1de5ODn6zBNnw/Qz4bZfylejIBiswpamx3Mxj6Qk0Jn4gmk/S7rVdmxRC8qBCLPzGNu/1cRN3OQr647Y1LAnoltP0/d+KDmSfR5hyG1N4quWJDCvPTX4as6dJtT6RutH5crioqR+O0W0dEiaXVrAI37kHLrcXL/rZjd9+eoUQ1WwvyJqTrMGfgC5vWu+tSYjwgkBMbAM42Wrjn9y8vT1XcrprqzkdMPR8y3yXJtdlRuDntAwu/++nsJZPv2wHdm279zSkMJDiYMpKlFTDq2Zlquz/hEQ/F82pPcLlNKly8ca+nKpAGchivXfcgZYLmTL1EOdySpdkGX3pcG4fuFnpwAggR81MNHAwScqIX2j8C8JbLQrcbMl9BFjqWVS3pGP0BXrTsAtIlyzDOMSXjkC1qI21Bx3oevI+EtxWCea0uR0KpkOkrTC5WfcYCrv3YLrNaTDs9gPYdPiQ+gxjkDTdMGgdLjsOEgxsJnbaB9V6Q2QtyOUHMWU3xYHXUsTc+xBcuIxHLbdiFtT3ggn1dvUt0iLDk+F+Q0uNl2mTIP4yQgYlyctiu8TdJV67YjF3wHNb4cSpUrBMusJ7Fv32H8/MltUVun50BxqbtwvmdXXRLIk9i0ZTt27jhgx1RdHTIIURd3MBD8gK5e/7ztZR6jV7kIYiKctHKlsoiuffgh9A6uQ32ck6Ogcpoip8JM/vvLnfjp029iMBNA1sTsattP0rddN5t++TY2v7ALg9mAM6/qagJMU13MRV/mWVzbeg/TjIvXTpiuU0W4iz0EK9o0tqzeiFTsBvRmAxDcisbbao+HnW8fwPrHX0Mi5uK8JXPwuZl11id8eKgfb+04gENHBnDz187DhRfMh8lw6x9Vznyt7yITdODIwJXonJ/BmjU2ZZ5oKFU2w7HeAdsT/Gzz46iN34BeG/A7lfgEq/q+i0MHe/Gbl97B7/cdxsBgdNqbiLtYcMpUXLJ8IeaeMgWGZVsN87zy6XwHlL6Cw3hu1h7L648EqmyWISYIa9YUhLB6PWr8O9CXZSlH7XOVaILn2LJ1mM6hbyBnBVCb9OHVxGwHuclzI0oFZNnWPTJIxSTS+S1Q+oZqmWeoquXF3spgb40WQVeuvdNsvnMXXOeHkOQgE7BzlONRT2zXQQiTBxxHonFKMloDraGzUdY3IfN2uzPK9gzzrpTO/YCuWPcP9lGVzDNMKoAZfjHCbFp9ETzxAGLOuYW22QkFMYRnWM/LxC8XGJfCQdLjwGw/AvVdurp1i72fMKL1pVKgageU0FS4MmN+dJmPhSd/F5B/h7jDF5a4JhDVvj9ZQ2VkXiwpZpzjiFzQB00PIq3upZWtvcMvakwGaLIDhyjkHLtwpGZ+8dfTETPfBqgZMWemJZ+3NG24M7N4x4o7kUaLxN5EsIdkxWsvXAmViDnRLZJs0A1DP0EY/BNd8/C7dsgnZJ7huMTwJXeFLGG3NyLlXQONFdDmQsScOnsdhs8b+TKFvTJTCP2KVHD5nsNkLmHbDi/Daj4I4A0Q/QKknqTLWz8a8+7QJIFwHMFulR1flsNvlprnm2fC0DJoWgZjlgBmHgymAuCDSluvjvoQTB9ARyGIV/dtSPk6oF6hy9f9YQgXMz5GP+NkgXACoCgINDXpYSfOhWctAs8droMK6uE5UXKQDxSkdwQH1ICtQ5RtauxQlQQ21YKDEwCRarIWbI0YaF8ZXZxsQlEgfEITndKUvTzJIXoH0MEC5DtDnH+cmIyb8CnDUMlt2BH10HFVdI/suK/yn+BPgDHh/wAAFrfPQw3SVAAAAABJRU5ErkJggg==";

const PUPIL_RANGE = 2.2; // px the pupil can drift from center
const EYE_LEFT = { x: 0.3125, y: 0.469 };  // fraction of image size
const EYE_RIGHT = { x: 0.6875, y: 0.469 };

export function PetIcon(props: { width?: number; height?: number; } & Record<string, any>) {
    const size = props.width ?? 26;

    const containerRef = useRef<HTMLDivElement>(null);
    const leftPupilRef = useRef<HTMLDivElement>(null);
    const rightPupilRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let frame: number;
        let mouseX = 0, mouseY = 0;

        const onMove = (e: MouseEvent) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        };
        window.addEventListener("mousemove", onMove);

        const tick = () => {
            frame = requestAnimationFrame(tick);

            const el = containerRef.current;
            if (!el) return;

            const rect = el.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;

            const dx = mouseX - cx;
            const dy = mouseY - cy;
            const dist = Math.hypot(dx, dy) || 1;

            const ox = (dx / dist) * PUPIL_RANGE;
            const oy = (dy / dist) * PUPIL_RANGE;

            const transform = `translate(-50%, -50%) translate(${ox}px, ${oy}px)`;
            if (leftPupilRef.current) leftPupilRef.current.style.transform = transform;
            if (rightPupilRef.current) rightPupilRef.current.style.transform = transform;
        };
        frame = requestAnimationFrame(tick);

        // Occasional blink, purely decorative
        const blinkTimeouts: ReturnType<typeof setTimeout>[] = [];
        const scheduleBlink = () => {
            const t = setTimeout(() => {
                if (leftPupilRef.current) leftPupilRef.current.style.opacity = "0";
                if (rightPupilRef.current) rightPupilRef.current.style.opacity = "0";
                blinkTimeouts.push(setTimeout(() => {
                    if (leftPupilRef.current) leftPupilRef.current.style.opacity = "1";
                    if (rightPupilRef.current) rightPupilRef.current.style.opacity = "1";
                }, 120));
                scheduleBlink();
            }, 2500 + Math.random() * 3500);
            blinkTimeouts.push(t);
        };
        scheduleBlink();

        return () => {
            window.removeEventListener("mousemove", onMove);
            cancelAnimationFrame(frame);
            blinkTimeouts.forEach(clearTimeout);
        };
    }, []);

    const pupilStyle = (eye: { x: number; y: number; }): React.CSSProperties => ({
        position: "absolute",
        left: `${eye.x * 100}%`,
        top: `${eye.y * 100}%`,
        width: Math.max(2, size * 0.09),
        height: Math.max(2, size * 0.09),
        borderRadius: "50%",
        background: "#fff",
        transition: "opacity 80ms ease"
    });

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: size,
                height: size,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none"
            }}
        >
            <img
                src={PET_IMAGE}
                width={size}
                height={size}
                style={{ display: "block" }}
                draggable={false}
            />
            <div ref={leftPupilRef} style={pupilStyle(EYE_LEFT)} />
            <div ref={rightPupilRef} style={pupilStyle(EYE_RIGHT)} />
        </div>
    );
}
