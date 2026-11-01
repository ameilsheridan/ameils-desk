import TopNav from '@/components/TopNav';
import ScrollTop from '@/components/ScrollTop';
import WorkGrid from '@/components/WorkGrid';

export default function WorkIndexView() {
  return (
    <div className="case">
      <TopNav tone="light" current="work" />
      <main id="main" className="work-index wrap">
        <div className="work-head">
          <h1>Selected work</h1>
          <p className="lede">Enterprise platforms, AI workflows, healthcare systems and personal experiments.</p>
        </div>
        <WorkGrid />
      </main>
      <ScrollTop />
    </div>
  );
}
