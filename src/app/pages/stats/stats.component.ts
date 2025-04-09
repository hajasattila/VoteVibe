import {AfterViewInit, Component, ElementRef, HostListener, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {DatabaseService} from 'src/api/services/database-service/database.service';
import {ApexNonAxisChartSeries, ApexChart,} from 'ng-apexcharts';
import {TranslateService} from '@ngx-translate/core';
import {ChartOptions} from "../../../api/models/chartOptions.model";

@Component({
    selector: 'app-stats',
    templateUrl: './stats.component.html',
    styleUrls: ['./stats.component.css']
})
export class StatsComponent implements OnInit, AfterViewInit {

    @ViewChild('chartDropdown') chartDropdownRef!: ElementRef;
    @ViewChild('userDropdown') userDropdownRef!: ElementRef;
    @ViewChild('sortDropdown') sortDropdownRef!: ElementRef;
    dropdownReady = false;

    public chartOptions!: ChartOptions;
    public chartType: ApexChart['type'] = 'pie';

    public labels: string[] = [];
    public series: ApexNonAxisChartSeries = [];

    protected isLoading: boolean = true;
    private themeObserver?: MutationObserver;

    protected selectedUserId: string = 'all';
    protected userDisplayMap: Record<string, string> = {};
    protected userDropdownOpen = false;
    protected voterDetails: { uid: string; votes: Record<string, number> }[] = [];
    protected voterUids: string[] = [];

    protected top3: { label: string, votes: number }[] = [];

    protected chartTypes: string[] = ['pie', 'donut', 'bar', 'line', 'radar', 'area', 'polarArea', 'radialBar'];
    protected selectedChartType: string = 'pie';
    protected chartDropdownOpen = false;


    constructor(
        private route: ActivatedRoute,
        private dbService: DatabaseService,
        private translate: TranslateService,
        private router: Router
    ) {
    }

    ngAfterViewInit() {
        this.dropdownReady = true;

        const htmlEl = document.documentElement;
        this.themeObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    this.updateChart();
                }
            });
        });

        this.themeObserver.observe(htmlEl, {
            attributes: true,
            attributeFilter: ['class']
        });
    }


    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
        const target = event.target as Node;

        if (this.dropdownReady) {
            const clickedChart = this.chartDropdownRef?.nativeElement.contains(target);
            const clickedUser = this.userDropdownRef?.nativeElement.contains(target);
            const clickedSort = this.sortDropdownRef?.nativeElement.contains(target);

            if (!clickedChart) {
                this.chartDropdownOpen = false;
            }

            if (!clickedUser) {
                this.userDropdownOpen = false;
            }

            if (!clickedSort) {
                this.sortDropdownOpen = false;
            }
        }
    }


    toggleChartDropdown() {
        this.chartDropdownOpen = !this.chartDropdownOpen;
        this.userDropdownOpen = false;
        this.sortDropdownOpen = false;
    }

    toggleUserDropdown() {
        this.chartDropdownOpen = false;
        this.userDropdownOpen = !this.userDropdownOpen;
        this.sortDropdownOpen = false;
    }

    toggleSortDropdown() {
        this.chartDropdownOpen = false;
        this.userDropdownOpen = false;
        this.sortDropdownOpen = !this.sortDropdownOpen;
    }

    ngOnInit(): void {
        const code = this.route.snapshot.paramMap.get('code');
        if (!code) return;

        this.dbService.watchRoomByCode(code).subscribe(room => {
            if (!room?.pollResults || !room.poll?.options) {
                this.isLoading = false;
                return;
            }

            const userMap: Record<string, string> = {};

            this.voterDetails = Object.entries(room.pollResults)
                .filter(([_, userVotes]) => userVotes && typeof userVotes === 'object')
                .map(([uid, userVotes]) => {
                    const display = room.members?.find(m => m.uid === uid)?.displayName || uid;
                    userMap[uid] = display;
                    return { uid, votes: userVotes };
                });

            this.userDisplayMap = userMap;
            this.labels = room.poll.options;
            this.voterUids = this.voterDetails.map(v => v.uid);

            if (this.selectedUserId === 'all') {
                this.series = this.labels.map(option => {
                    return this.voterDetails.reduce((sum, v) => sum + (v.votes?.[option] || 0), 0);
                });
            } else {
                const userVotes = this.voterDetails.find(v => v.uid === this.selectedUserId)?.votes || {};
                this.series = this.labels.map(option => userVotes[option] || 0);
            }

            this.originalLabels = [...this.labels];
            this.originalSeries = [...this.series];

            this.updateChart();
            this.isLoading = false;
        });
    }


    updateChart(): void {
        const translatedTitle = this.translate.instant('room.statsChart.chartTitle');

        const multiSeriesTypes = ['bar', 'line', 'area', 'radar', 'heatmap'];
        const isMultiSeries = multiSeriesTypes.includes(this.chartType);
        const finalSeries = isMultiSeries
            ? [{name: this.translate.instant('room.statsChart.seriesName'), data: this.series}]
            : this.series;

        const isDark = document.documentElement.classList.contains('dark');

        this.chartOptions = {
            series: finalSeries as any,
            chart: {
                type: this.chartType,
                height: 350
            },
            labels: this.labels,
            title: {
                text: translatedTitle,
                style: {
                    color: isDark ? '#f3f4f6' : '#1f2937',
                    fontSize: '20px',
                    fontWeight: 'bold'
                }
            },
            theme: {
                mode: isDark ? 'dark' : 'light'
            },
            legend: {
                labels: {
                    colors: isDark ? '#f3f4f6' : '#1f2937'
                }
            },
            responsive: [
                {
                    breakpoint: 480,
                    options: {
                        chart: {
                            width: 300
                        },
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            ]
        };

        this.top3 = this.labels
            .map((label, i) => ({
                label,
                votes: this.series[i] || 0
            }))
            .sort((a, b) => b.votes - a.votes)
            .slice(0, 3);

    }

    selectChartType(type: string) {
        this.selectedChartType = type;
        this.chartType = type as ApexChart['type'];
        this.chartDropdownOpen = false;
        this.updateChart();
    }

    getChartIcon(type: string): string {
        switch (type) {
            case 'pie':
                return 'pie_chart';
            case 'donut':
                return 'donut_large';
            case 'bar':
                return 'bar_chart';
            case 'line':
                return 'show_chart';
            case 'radar':
                return 'track_changes';
            case 'area':
                return 'stacked_line_chart';
            case 'polarArea':
                return 'explore';
            case 'radialBar':
                return 'radio_button_checked';
            default:
                return 'insert_chart';
        }
    }

    onUserSelectChange(): void {
        if (this.selectedUserId === 'all') {
            this.series = this.labels.map(option => {
                return this.voterDetails.reduce((sum, v) => sum + (v.votes?.[option] || 0), 0);
            });
        } else {
            const userVotes = this.voterDetails.find(v => v.uid === this.selectedUserId)?.votes || {};
            this.series = this.labels.map(option => userVotes[option] || 0);
        }

        this.updateChart();
    }

    sortOption: 'default' | 'asc' | 'desc' = 'default';
    originalLabels: string[] = [];
    originalSeries: ApexNonAxisChartSeries = [];

    onSortOptionChange(): void {
        let data: { label: string, votes: number }[];

        if (this.sortOption === 'default') {
            this.labels = [...this.originalLabels];
            this.series = [...this.originalSeries];
        } else {
            data = this.labels.map((label, i) => ({label, votes: this.series[i]}));

            if (this.sortOption === 'asc') {
                data = data.sort((a, b) => a.votes - b.votes);
            } else if (this.sortOption === 'desc') {
                data = data.sort((a, b) => b.votes - a.votes);
            }

            this.labels = data.map(d => d.label);
            this.series = data.map(d => d.votes);
        }

        this.updateChart();
    }

    sortDropdownOpen = false;
    sortOptions: ('default' | 'asc' | 'desc')[] = ['default', 'desc', 'asc'];

    selectSortOption(option: 'default' | 'asc' | 'desc'): void {
        this.sortOption = option;
        this.sortDropdownOpen = false;
        this.onSortOptionChange();
    }

    getSortIcon(option: 'default' | 'asc' | 'desc'): string {
        switch (option) {
            case 'asc':
                return 'arrow_upward';
            case 'desc':
                return 'arrow_downward';
            case 'default':
            default:
                return 'sort';
        }
    }

    goBackToRoom(): void {
        const currentUrl = this.router.url;
        const baseUrl = currentUrl.replace(/\/stats$/, '');
        this.router.navigateByUrl(baseUrl);
    }

    isMultiSeries(): boolean {
        const multiSeriesTypes = ['bar', 'line', 'area', 'radar', 'heatmap'];
        return multiSeriesTypes.includes(this.chartType);
    }

    getVoteCountAtIndex(index: number): number {
        if (this.isMultiSeries()) {
            const series = this.chartOptions.series as unknown as { data: number[] }[];
            return series[0]?.data?.[index] ?? 0;
        } else {
            const series = this.chartOptions.series as number[];
            return series[index] ?? 0;
        }
    }


}
