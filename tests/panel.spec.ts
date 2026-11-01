import { expect, test } from '@grafana/plugin-e2e';

test('should display "No data" when the query returns no points', async ({
  gotoPanelEditPage,
  readProvisionedDashboard,
}) => {
  const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
  const panelEditPage = await gotoPanelEditPage({ dashboard, id: '2' });
  await expect(panelEditPage.panel.locator).toContainText('No data');
});

test('should display the compass when numeric data is present', async ({
  gotoPanelEditPage,
  readProvisionedDashboard,
  page,
}) => {
  const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
  const panelEditPage = await gotoPanelEditPage({ dashboard, id: '1' });
  await expect(panelEditPage.panel.locator.getByTestId('compass-dial')).toBeVisible();
  await expect(page.getByTestId('compass-readout')).toContainText('°');
});

test('should draw a needle inside the dial', async ({ gotoPanelEditPage, readProvisionedDashboard, page }) => {
  const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
  await gotoPanelEditPage({ dashboard, id: '1' });

  const dial = page.getByTestId('compass-dial');
  const needle = page.getByTestId('compass-needle');
  await expect(needle).toBeVisible();

  const dialBox = await dial.boundingBox();
  const needleBox = await needle.boundingBox();
  expect(dialBox).not.toBeNull();
  expect(needleBox).not.toBeNull();
  expect(needleBox!.width).toBeGreaterThan(0);
  expect(needleBox!.height).toBeGreaterThan(0);

  const centerX = needleBox!.x + needleBox!.width / 2;
  const centerY = needleBox!.y + needleBox!.height / 2;
  expect(centerX).toBeGreaterThan(dialBox!.x);
  expect(centerX).toBeLessThan(dialBox!.x + dialBox!.width);
  expect(centerY).toBeGreaterThan(dialBox!.y);
  expect(centerY).toBeLessThan(dialBox!.y + dialBox!.height);

  const fill = await needle
    .locator('polygon')
    .nth(1)
    .evaluate((element) => getComputedStyle(element).fill);
  expect(fill).not.toBe('none');
  expect(fill).not.toBe('transparent');
  const channels = fill.match(/rgba?\(([^)]+)\)/);
  expect(channels).not.toBeNull();
  const alpha = channels![1].split(',').map((part) => Number(part.trim()))[3];
  if (alpha !== undefined) {
    expect(alpha).toBeGreaterThan(0);
  }
});

test('should show the direction trail when the option is enabled', async ({
  gotoPanelEditPage,
  readProvisionedDashboard,
  page,
}) => {
  const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
  const panelEditPage = await gotoPanelEditPage({ dashboard, id: '1' });
  const options = panelEditPage.getCustomOptions('Compass');
  await options.getSwitch('Show direction trail').check();
  await expect(page.getByTestId('compass-trail')).toBeVisible();
});
